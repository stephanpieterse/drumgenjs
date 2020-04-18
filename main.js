/* global Buffer, require, module, setInterval, clearInterval */
/* jslint strict:false */

var exec = require('child_process').exec;
var fs = require('fs');
var util = require('./util.js');
var cache = util.cache;
var config = require('./config.js');

var timers = require('./timers.js');
var metrics = require('./metrics.js');
var queue = require('queue');
var miditools = require('./miditools.js');

var Log = require('./logger.js');

var q = new queue();
q.timeout = config.queue.timeout;
q.concurrency = config.queue.concurrency;
q.autostart = true;
q.on('timeout', function(continuejob, job) {
    metrics.increment('errors', 'q-timeouts');
    Log.error({
        job: job,
        continuejob: continuejob
    }, 'A q job timed out!');
});

var dir_prefix = config.tmpdir;

var impExpMap = {
    "[[": "s",
    "[1": "N",
    "[0": "n",
    "1]": "M",
    "0]": "m",
    "1,": "B",
    "0,": "b",
    ",1": "A",
    ",0": "a",
    "],": "p",
    ",[": "P",
    "]]": "e",
    "]": "l",
    "[": "k",
    ",": "c"
};

var nl = "\n";
var space = " ";
var repeatCount = 2;

var genLilyTupleMapper = function(blocks, repnote, noteBase) {
    var file = "";
    var normDiv = [2, 4, 8, 16];

    for (var b = 0; b < blocks.length; b++) {
        if (Array.isArray(blocks[b])) {
            var noteDur = "" + noteBase;
            var tupNum = blocks[b].length;
            if (normDiv.indexOf(tupNum) !== -1) {
                noteDur = "" + (tupNum * noteBase);
            } else {
                file += "\\tuplet " + tupNum + "/2 " + "\n";
                noteDur = "" + (noteDur * 2);
            }
            file += "{ " + nl;

            file += genLilyTupleMapper(blocks[b], repnote, parseInt(noteDur));

            file += "} " + "\n";
        } else {
            file += genLilySingleMapper(blocks[b], repnote, noteBase);
        }
    }
    return file;

};

var genLilySingleMapper = function(blockb, repnote, noteBase) {
    var file = "";
    switch (blockb) {
        case "L":
            //file += repnote + noteBase + '->-"L"' + space;
            file += repnote + (noteBase) + '->-"L"-\\omit\\fff' + space;
            break;
        case "l":
            //file += repnote + noteBase + '-"L"' + space;
            file += repnote + (noteBase) + '-"L"-\\omit\\pp' + space;
            break;
        case "R":
            //file += repnote + noteBase + '->-"R"' + space;
            file += repnote + (noteBase) + '->-"R"-\\omit\\fff' + space;
            break;
        case "r":
            //file += repnote + noteBase + '-"R"' + space;
            file += repnote + (noteBase) + '-"R"-\\omit\\pp' + space;
            break;
        case "X":
            //file += repnote + noteBase + "->" + space;
            file += repnote + (noteBase) + "->-\\omit\\fff" + space;
            break;
        case "x":
            //file += repnote + noteBase + space;
            file += repnote + (noteBase) + '-\\omit\\pp' + space;
            break;
        case "-":
            file += "r" + noteBase + space;
            break;
    }

    return file;
};

var genLilypondPart = function(blocks, repnote, noteBase) {
    var file = "";
    var normDiv = [2, 4, 8, 16];
    noteBase = noteBase || 4;

    // for nested and nice stuff, we need to
    // split the arr and normal mapping into
    // two functions so we can recurse

    file += "{";
    for (var b = 0; b < blocks.length; b++) {
        if (Array.isArray(blocks[b])) {
            var noteDur = "" + noteBase;
            var tupNum = blocks[b].length;
            if (normDiv.indexOf(tupNum) !== -1) {
                noteDur = "" + (tupNum * noteBase);
            } else {
                file += "\\tuplet " + tupNum + "/2 " + "\n";
                noteDur = "" + (noteDur * 2);
            }
            file += "{ " + nl;
            file += genLilyTupleMapper(blocks[b], repnote, parseInt(noteDur));

            file += "} " + "\n";

        } else {
            file += genLilySingleMapper(blocks[b], repnote, noteBase);

        }
    }
    file += " }";
    return file;
};

// var genMetronomePart = function(patlen, eopts) {
var genMetronomePart = function(patlen) {
    var metro = "";
    metro += "\\new DrumStaff" + "\n";
    metro += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 \\override Stem.Y-extent = ##f " + 'instrumentName = #"Metronome"' + " \\override Stem #'(details beamed-lengths) = #'(2) }" + "\n";
    metro += "{" + "\n";
    metro += "\\time " + patlen + "/4" + nl;
    metro += "\\drummode {" + nl;
    metro += "\\repeat volta " + repeatCount + " << {";
    metro += " wbh4 ";
    for (var w = 1; w < patlen; w++) {
        metro += " wbl4 ";
    }
    metro += " } >>" + nl;
    metro += "}" + nl;
    metro += "}" + nl;
    return metro;
};

var getLilypondHeader = function() {
    var head = "";
    var paperString = "\\paper {" + nl +
        " indent = 0\\mm" + nl +
        " line-width = 110\\mm" + nl +
        " oddHeaderMarkup = \"\"" + nl +
        " evenHeaderMarkup = \"\"" + nl +
        " oddFooterMarkup = \"\"" + nl +
        " evenFooterMarkup = \"\"" + nl +
        "}";
    head += "\\version \"2.18.2\" " + nl;
    head += "#(ly:set-option 'resolution '400)" + nl;
    head += "#(ly:set-option 'pixmap-format 'pngalpha)" + nl;
    head += "#(ly:set-option 'backend 'eps)" + nl;
    head += "#(ly:set-option 'no-gs-load-fonts '#t)" + nl;
    head += "#(ly:set-option 'include-eps-fonts '#t)" + nl;
    head += paperString;
    var defDrums = "#(define mydrums '( (hihat  cross   #f  0) ))";
    head += defDrums;
    return head;
};

var genMusicBlockSection = function(blocks, options) {

    var mappings = options.mappings;
    var staffnames = options._staffnames;
    var patlen = blocks[0].length;

		// I don't think this is needed overall,
    // but it does cause lilypond pre 2.19
		// issues when I was messing around
    // because repnote in the further functions
    // became undefined
		while (mappings.length < blocks.length){
			mappings.push(mappings[0]);
		}

    var file = "";
    file += "<<" + nl;

    file += "<<" + nl;
    for (var block in blocks) {
        file += "\\new DrumStaff " + nl;
        file += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 " + 'instrumentName = #"' + staffnames[block] + '"' + " }" + nl;
        file += " { " + nl;
        file += "\\omit Score.MetronomeMark" + nl;
        file += "\\time " + patlen + "/4" + nl;
        file += "\\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)" + nl;
        if (options.tempo) {
            file += "\\tempo 4 = " + options.tempo + nl;
        }
        file += "\\drummode {" + nl;
        file += "\\repeat volta " + repeatCount + " ";
        file += genLilypondPart(blocks[block], mappings[block]);
        file += "}" + nl;
        file += "}" + nl;
    }
    file += ">>" + nl;

    if (!options.noMetronome) {
        file += genMetronomePart(patlen, options);
    }

    file += ">>" + nl;
    return file;
};

var patternToLilypond = function(blocks, options) {
    options = getDefaultOptions(options);

    //var mappings = options.mappings || ["hh", "sn", "bd", "hh"];
    //var mappings = ["hh", "sn", "bd", "hh"];
    //if (options.mappings && options.mappings[0]) {
    //    mappings = options.mappings;
    //}
    //// I'm actually a bit confused about this line,
    //// but for now I think we need it.
    //options.mappings = mappings;

    var staffnames = ["HiHat", "Snare", "Bass Drum", "HH Foot"];
    if (options.noNames) {
        staffnames = ["", "", "", ""];
    }
    options._staffnames = staffnames;

    var file = "";
    file += getLilypondHeader();
    // some metadata for our cleaning scripts
    file += nl;
    file += "% gendate:" + parseInt(Date.now() / 1000) + nl;
    file += "% filename:" + options._fullname + nl;
    file += "\\score {" + nl;

    options._isMidiSection = false;
    file += genMusicBlockSection(blocks, options);

    file += "\\layout { }" + nl;

    file += "}" + nl;


    options._isMidiSection = true;
    file += "\\score {" + nl;
    file += "\\unfoldRepeats " + nl;
    file += genMusicBlockSection(blocks, options);
    file += "\\midi { }" + nl;
    file += "}";
    return file;
};

var makeCleanBlock = function(blocks) {
    var pat = [];
    for (var b = 0; b < blocks; b++) {
        pat[b] = '|';
    }

    return pat;
};

var genericMapper = function(num, patlen, mappings) {

    var cachedid = "genmapper-" + JSON.stringify(arguments);
    var cid = cache.get(cachedid);

    if (cid) {
        Log.debug({
            cacheitem: cid,
            id: cachedid
        }, "Returning map from cache");
        return cache.get(cachedid);
    }

    var pattern = [];
    var sipattern = [];
    pattern[0] = makeCleanBlock(patlen);
    sipattern[0] = makeCleanBlock(patlen);

    var barlen = patlen;
    var notetypes = mappings.length;

    var randPat = parseInt(num);
    var cpat = (randPat).toString(notetypes);
    cpat = lpad(cpat, barlen);
    pattern[0] = cpat.split("");
    for (var px in pattern[0]) {
        // pattern[0][px] = mappings[pattern[0][px]];
        pattern[0][px] = mappings[(pattern[0][px]).toString(10)];
    }

    sipattern[0] = pattern[0];

    Log.debug({
        id: cachedid,
        cacheitem: sipattern[0]
    }, "Setting item in cache");
    cache.set(cachedid, sipattern[0], 7200);

    return sipattern[0];
};

var convertNumToTuple = function(num, patlen, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['1', '2', '3', '4', '5'] : mappings;
    mappings.sort();

    if (mappings.length < 2) {
        mappings.unshift(mappings[0]);
    }

    patlen = patlen || 8;

    return genericMapper(num, patlen, mappings);

};

var getMappedTuple = function(tuple, num, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['-', 'r', 'R', 'l', 'L'] : mappings;
    var patlen = tuple;

    return genericMapper(num, patlen, mappings);

};

var importBlocks = function(patid) {
    var cpid = "patid" + patid;
    if (cache.get(cpid)) {
        return cache.get(cpid);
    }

    var pat = new Buffer(patid);
    pat = pat.toString('UTF-8');

    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(regexEscape(impExpMap[m]), "g");
        Log.trace(pat);
        pat = pat.replace(regex, m);
        Log.trace(pat);
    }

    pat = pat.replace(/0/g, '"-"');
    pat = pat.replace(/1/g, '"x"');
    pat = pat.replace(/2/g, '"X"');
    pat = pat.replace(/3/g, '"r"');
    pat = pat.replace(/4/g, '"R"');
    pat = pat.replace(/5/g, '"l"');
    pat = pat.replace(/6/g, '"L"');

    Log.trace(pat);
    cache.set(cpid, pat, 7200);
    return pat;
};

var exportBlocks = function(blocks) {
    var pat = JSON.stringify(blocks);
    Log.trace(pat);
    var enc = new Buffer(pat);
    Log.debug(enc.toString('base64'));
    enc = enc.toString();

    enc = enc.replace(/"-"/g, 0);
    enc = enc.replace(/"x"/g, 1);
    enc = enc.replace(/"X"/g, 2);
    enc = enc.replace(/"r"/g, 3);
    enc = enc.replace(/"R"/g, 4);
    enc = enc.replace(/"l"/g, 5);
    enc = enc.replace(/"L"/g, 6);

    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(regexEscape(m), "g");
        enc = enc.replace(regex, impExpMap[m]);
    }

    enc = new Buffer(enc);
    enc = enc.toString();
    return enc;
};

function regexEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

var getDefaultOptions = function(eopts) {
    var options = JSON.parse(JSON.stringify(eopts)) || {};
    options.maxNotes = options.maxNotes || 8;
    options.minNotes = options.minNotes || 4;
    options.tempo = isNaN(parseInt(eopts.tempo)) ? 100 : parseInt(eopts.tempo);
    return options;
};


var generateLilypond = function(pattern, eopts) {
    return new Promise(function(resolve, reject) {
        eopts = getDefaultOptions(eopts);
        eopts = generateFilename(pattern, eopts);

        //eopts.mappings = (eopts.map ? [eopts.map] : "sn");
        eopts.mappings = (eopts.map ? (Array.isArray(eopts.map) ? eopts.map : eopts.map.split(',')) : ["sn"]);

        timers.start("gen-lily");
        metrics.increment('generated', 'lilypond-files');
        var finalPattern = patternToLilypond(pattern, eopts);
        timers.end("gen-lily");

        if (fs.existsSync(eopts._fullname_notempo + ".ly")) {
            resolve();
            return;
        }

        fs.writeFile(eopts._fullname_notempo + ".ly", finalPattern, function(error) {
            if (error) {
                Log.error(error);
                reject(error);
                return;
            }
            resolve();
        });
    });
};

var tagPNG = function(filename) {
    return new Promise(function(resolve, reject) {
        timers.start('tag-png');
        var tagchild;
        // exiftool is nicer but damn slow
        // var tagchild = exec('exiftool -author=DrumGen -comment="Generated for your practicing enjoyment" ' + filename + '.png', function(err, stdout, stderr) {
        tagchild = exec('mogrify -comment "Generated by DrumGen for your practicing enjoyment" ' + filename + '.png', function(err, stdout, stderr) {
            timers.end('tag-png');
            Log.debug('stdout: ' + stdout);
            Log.debug('stderr: ' + stderr);
            if (err) {
                Log.error(err);
                reject();
            }
            resolve();
        });
    });
};

var generatePNG = function(filename) {

    return new Promise(function(resolve, reject) {

        if (fs.existsSync(filename + ".png")) {
            resolve();
            return;
        }

        timers.start("gen-png");
        metrics.increment('generated', 'images');
        var genchild;
        q.push(function(cb) {
            //genchild = exec("cd " + dir_prefix + " && lilypond --png '" + filename + ".ly' && convert " + filename + ".png -trim " + filename + ".s.png", function(error, stdout, stderr) {
            genchild = exec("cd " + dir_prefix + " && bash /opt/app/lilyclient.sh --png '" + filename + ".ly'", function(error, stdout, stderr) {
                timers.end("gen-png");
                Log.debug('stdout: ' + stdout);
                Log.debug('stderr: ' + stderr);
                if (error !== null) {
                    Log.error('exec error: ' + error);
                    reject(error);
                    cb();
                    return;
                }
                tagPNG(filename).then(function() {
                    resolve();
                    cb();
                }).catch(function() {
                    resolve();
                    cb();
                });
            });
        });
    });
};

var tagOGG = function(filename) {
    return new Promise(function(resolve, reject) {
        var tagchild;
        timers.start('tag-ogg');
        tagchild = exec('lltag --yes --ogg -a "DrumGen" -d `date` -t "' + filename + '" -c "Generated for your practicing enjoyment" ' + filename + '.ogg', function(err, stdout, stderr) {
            timers.end('tag-ogg');
            Log.debug('stdout: ' + stdout);
            Log.debug('stderr: ' + stderr);
            if (err) {
                Log.error(err);
                reject();
            }
            resolve();
        });
    });
};

var generateOGG = function(filename, endtime) {
    return new Promise(function(resolve, reject) {

        if (fs.existsSync(filename + ".ogg")) {
            resolve();
            return;
        }

				endtime = endtime || "";
        timers.start("gen-ogg");
        metrics.increment('generated', 'audio');
        q.push(function(cb) {
            var audiochild;
            audiochild = exec("timidity --preserve-silence -EFreverb=0 -A120 -OwM1 " + filename + ".midi &&  sox " + filename + ".wav " + filename + ".ogg trim 0 " + endtime + " ", function(error, stdout, stderr) {
                timers.end("gen-ogg");
                Log.debug('stdout: ' + stdout);
                Log.debug('stderr: ' + stderr);
                if (error !== null) {
                    Log.error('exec error: ' + error);
                    reject(error);
                    return;
                }
                tagOGG(filename).then(function() {
                    resolve();
                    cb();
                }).catch(function() {
                    resolve();
                    cb();
                });
            });
        });
    });
};

var generateAllFiles = function(pattern, eopts) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    var cacheName = "cache-gen-prom-" + pattern + JSON.stringify(eopts);
    var cachedItem = cache.get(cacheName);

    if (cachedItem) {
        return cachedItem;
    }

    var prom = new Promise(function(resolve, reject) {
        generateLilypond(pattern, eopts).then(function() {
            //generatePNG(eopts._fullname).then(function() {
            generatePNG(eopts._fullname_notempo).then(function() {
                resolve();
            }).catch(function(e) {
                reject(e);
            });
        }).catch(function(e) {
            reject(e);
        });
    });

    cache.set(cacheName, prom, 30);
    return prom;
};

var generateFilename = function(pattern, eopts) {

		var nameOpts = [eopts.map,eopts.pattern, eopts.noMetronome];
		var fullBuffedOpts = Buffer.from(JSON.stringify(nameOpts)).toString('hex');
    var filenames_pre_notempo = fullBuffedOpts + exportBlocks(pattern) + (eopts.noMetronome ? '-nometro' : '-metro');
    var filenames_pre = filenames_pre_notempo + '-' + eopts.tempo;
    var fullname = dir_prefix + filenames_pre;
    var fullname_notempo = dir_prefix + filenames_pre_notempo;
    eopts._fullname = fullname;
    eopts._fullname_notempo = fullname_notempo;
    eopts._filenames_pre = filenames_pre;
    eopts._filenames_pre_notempo = filenames_pre_notempo;
    eopts._pattern = pattern;

    return eopts;
};

var getOrMakeFile = function(pattern, eopts, cb) {
    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    generateAllFiles(pattern, eopts).then(function() {
        cb();
    }).catch(function(e) {
        cb(e);
    });

};

var getAudio = function(pattern, eopts, cb) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    getOrMakeFile(pattern, eopts, function(makeErr) {
        if (makeErr) {
            Log.error(makeErr);
            cb(makeErr);
            return;
        }
        miditools.changeMidiTempo(eopts.tempo, eopts._fullname_notempo + ".midi", eopts._fullname + ".midi");
				patendtime = (60 / eopts.tempo) * eopts._pattern[0].length * repeatCount;
        generateOGG(eopts._fullname, patendtime).then(function() {
            getAudioData(pattern, eopts, function(err, auData){
              if (err) {
                Log.error(err);
              }
              cb(err, auData);
              return;
            });
        }).catch(function(e) {
            Log.error(e);
            cb(e);
        });
    });
};

var getAudioData = function(pattern, eopts, cb) {

        timers.start("read-ogg");
        fs.readFile(eopts._fullname + ".ogg", function(err, data) {
            timers.end("read-ogg");
            if (err) {
              cb(err, {});
              return;
            }

            var audioResult = {};
            if (eopts.asBase64) {
                var datString = "data:audio/ogg;base64," + data.toString("base64");
                audioResult.contentType = 'text/plain';
                audioResult.data = datString;
            } else {
                audioResult.contentType = 'audio/ogg';
                audioResult.data = data;
            }
            cb(null, audioResult);
            return;
        });
};

var getImage = function(pattern, eopts, cb) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    getOrMakeFile(pattern, eopts, function(makeErr) {

        if(makeErr){
              Log.error(makeErr);
              cb(makeErr)
              return;
        }

        getImageData(pattern, eopts, function(err, imgData){
          if (err) {
              Log.error(err);
          }
          cb(err, imgData);
          return;
          });
    });
};

var getImageData = function(pattern, eopts, cb) {

    timers.start("read-img");
    fs.readFile(eopts._fullname_notempo + ".png", function(err, buf) {

        timers.end("read-img");

        if (err) {
            cb(err, {});
            return;
        }

        var imgResult = {};
        if (eopts.asBase64) {
            var imageAsBase64 = "data:image/png;base64," + buf.toString("base64");
            imgResult.contentType = 'text/plain';
            imgResult.data = imageAsBase64;
        } else {
            imgResult.contentType = 'image/png';
            imgResult.data = buf;
        }
        cb(null, imgResult);
        return;
    });
    return;
};


var lpad = function(value, padding) {
    var zeroes = "0";

    for (var i = 0; i < padding; i++) {
        zeroes += "0";
    }

    return (zeroes + value).slice(padding * -1);
};

var convertNumSimple = function(num, patlen, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['-', 'r', 'R', 'l', 'L'] : mappings;

    patlen = patlen || 8;

    var ret = exportBlocks([genericMapper(num, patlen, mappings)]);
    return ret;
};

var convertNum = function(num, patlen, tuples) {
    var simpleBlocks = convertNumSimple(num, patlen);

    if (tuples) {
        var tupMap = tuples.split(",");

        console.log(tupMap);
        // TODO
    }
    return simpleBlocks;

};

var convertMulti = function(num, patlen) {
    var nums = num.split(",");
    Log.debug(nums);
    // var mappings = ['-', 'r', 'R', 'l', 'L'];
    var mappings = ['-', 'x', 'X'];

    patlen = patlen || 8;

    var pattern = [];
    var sipattern = [];

    for (var j in nums) {
        pattern[j] = makeCleanBlock(patlen);
        sipattern[j] = makeCleanBlock(patlen);
        var barlen = patlen;
        var notetypes = mappings.length;

        var randPat = parseInt(nums[j]);
        Log.trace(randPat);
        var cpat = (randPat).toString(notetypes);
        cpat = lpad(cpat, barlen);
        pattern[j] = cpat.split("");
        for (var px in pattern[j]) {
            pattern[j][px] = mappings[pattern[j][px]];
        }
        sipattern[j] = pattern[j];
    }

    var ret = exportBlocks(sipattern);
    return ret;
};

// we can probably use streams to pipe out
// the generated sections, and avoid req,res coming
// into this file
// function might need to be split into 2 then
var getAll8 = function(req, res) {
    var patlen = req.params['patlen'] || 4;
    var pagenum = req.query['page'] || 1;
    var maxpatlen = 16 + 1;
    pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
    pagenum = Math.abs(pagenum);
    patlen = isNaN(patlen) ? 4 : patlen;
    patlen = Math.abs(patlen % maxpatlen);
    var barlen = patlen;

    var pagebody = fs.readFileSync('static/permutationsheet.html', 'utf8');
    var mappings = ['r', 'R', 'l', 'L'];
    var pageLinkAdd = "";
    if (req.query['blanks']) {
        mappings = mappings.concat(['x', 'X']);
        pageLinkAdd += "&blanks=true";
    }
    if (req.query["rests"]) {
        mappings.push("-");
        pageLinkAdd += "&rests=true";
    }

    var pattern = [];
    var sipattern = [];
    pattern[0] = makeCleanBlock(8);
    sipattern[0] = makeCleanBlock(8);

    var notetypes = mappings.length;
    var maxPatterns = Math.pow(notetypes, barlen);
    var maxPages = Math.ceil(Math.pow(notetypes, barlen) / config.worksheet.pageItems);
    if (pagenum > maxPages) {
        pagenum = 1;
    }
    var mxpat = pagenum * config.worksheet.pageItems;
    if (mxpat > maxPatterns) {
        mxpat = maxPatterns;
    }

    var randomPageNum = Math.round((Math.random() * maxPages) + 1);

    //var pageHost = config.server.fullhost;
    var pageHost = "";

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Connection': 'Transfer-Encoding'
    });

    var patLenLinks = "";
    for (var i = 2; i < maxpatlen; i++) {
        patLenLinks += '<a href="/worksheet/' + i + '"> ' + i + ' </a>';
    }
    var prevPageLink = pageHost + "/worksheet/" + patlen + "?page=" + ((pagenum - 1) > 0 ? pagenum - 1 : 1) + pageLinkAdd;
    var nextPageLink = pageHost + "/worksheet/" + patlen + "?page=" + (pagenum + 1) + pageLinkAdd;
    var randomPageLink = pageHost + "/worksheet/" + patlen + "?page=" + randomPageNum;
    var footerData = "Page " + pagenum + " of " + maxPages;
    pageStart = pageStart.replace("{{PREVPAGE}}", prevPageLink);
    pageStart = pageStart.replace("{{NEXTPAGE}}", nextPageLink);
    pageStart = pageStart.replace("{{RANDOMPAGE}}", randomPageLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);
    pageEnd = pageEnd.replace("{{PAGENUM}}", footerData);

    res.write(pageStart);
    res.flushHeaders();
    var written = (pagenum - 1) * config.worksheet.pageItems;

    var bufferWriteInterval = setInterval(function() {
        if (written < mxpat) {
            var mx = written;
            var cpat = (mx).toString(notetypes);
            cpat = lpad(cpat, barlen);
            pattern[mx] = cpat.split("");
            for (var px in pattern[mx]) {
                pattern[mx][px] = mappings[pattern[mx][px]];
            }
            sipattern[0] = pattern[mx];
            res.write("<div><img src='" + pageHost + "/public/image?noname=true&nometro=true&patref=" + exportBlocks(sipattern) + "' alt='Pattern " + exportBlocks(sipattern) + "' /></div>" + nl);
            //res.flush();
            written += 1;
        } else {
            res.write(pageEnd);
            res.end();
            clearInterval(bufferWriteInterval);
        }
    }, 10);
};

module.exports = {
    importBlocks: importBlocks,
    exportBlocks: exportBlocks,
    getImage: getImage,
    getAudio: getAudio,
    getAll8: getAll8,
    getMappedTuple: getMappedTuple,
    convertNumToTuple: convertNumToTuple,
    convertNum: convertNum,
    convertNumSimple: convertNumSimple,
    convertMulti: convertMulti,
    lpad: lpad,
};
