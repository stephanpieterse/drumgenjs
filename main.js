/* global Buffer, require, module, setInterval, clearInterval */
/* jslint strict:false */

// var sys = require('util');
var exec = require('child_process').exec;
var fs = require('fs');
var util = require('./util.js');
var cache = util.cache;
var config = require('./config.js');

var timers = require('./timers.js');
var metrics = require('./metrics.js');
var queue = require('queue');

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

var genLilypondPart = function(blocks, repnote, noteBase) {
    var file = "";
    var normDiv = [2, 4, 8, 16];
    var space = " ";
    noteBase = noteBase || 4;

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
            for (var tt = 0; tt < tupNum; tt++) {
                switch (blocks[b][tt]) {
                    case "L":
                        file += repnote + (noteDur) + '->-"L"-\\omit\\fff' + space;
                        break;
                    case "l":
                        file += repnote + (noteDur) + '-"L"-\\omit\\pp' + space;
                        break;
                    case "R":
                        file += repnote + (noteDur) + '->-"R"-\\omit\\fff' + space;
                        break;
                    case "r":
                        file += repnote + (noteDur) + '-"R"-\\omit\\pp' + space;
                        break;
                    case "X":
                        file += repnote + (noteDur) + "->-\\omit\\fff" + space;
                        break;
                    case "x":
                        file += repnote + (noteDur) + '-\\omit\\pp' + space;
                        break;
                    case "-":
                        file += "r" + (noteDur) + space;
                        break;
                }
            }

            file += "} " + "\n";

        } else {
            switch (blocks[b]) {
                case "L":
                    file += repnote + noteBase + '->-"L"' + space;
                    break;
                case "l":
                    file += repnote + noteBase + '-"L"' + space;
                    break;
                case "R":
                    file += repnote + noteBase + '->-"R"' + space;
                    break;
                case "r":
                    file += repnote + noteBase + '-"R"' + space;
                    break;
                case "X":
                    file += repnote + noteBase + "->" + space;
                    break;
                case "x":
                    file += repnote + noteBase + space;
                    break;
                case "-":
                    file += "r" + noteBase + space;
                    break;
            }
        }
    }
    file += " }";
    return file;
};

var genMetronomePart = function(patlen, eopts) {
    var metro = "";
    metro += "\\new DrumStaff" + "\n";
    metro += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 \\override Stem.Y-extent = ##f " + 'instrumentName = #"Metronome"' + " }" + "\n";
    metro += "{" + "\n";
    metro += "\\time " + patlen + "/4" + nl;
    metro += "\\drummode {" + nl;
    metro += "\\repeat volta 4 << {";
    for (var w = 0; w < patlen; w++) {
        metro += " wbl4 ";
    }
    metro += " } >>" + nl;
    //metro += "\\repeat volta 4 ";
    //for (var w = 0; w < patlen; w++) {
    //    metro += "<< {wbl4 } >> ";
    //}
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
    head += "#(ly:set-option 'resolution '300)" + nl;
    head += "#(ly:set-option 'pixmap-format 'pnggray)" + nl;
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
        file += "\\repeat volta 4 ";
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

//var addRandomNotes = function(block, prob) {
//    var pat = block;
//
//    for (var p = 0; p < pat.length; p++) {
//        if (getChoice(prob)) {
//            pat[p] = 'x';
//        } else {
//            pat[p] = '-';
//        }
//    }
//
//    return pat;
//};

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
        mappings.unshift('1');
    }

    patlen = patlen || 8;

    return genericMapper(num, patlen, mappings);

};

var getMappedTuple = function(tuple, num, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['-', 'r', 'R', 'l', 'L'] : mappings;
    var patlen = tuple;

    return genericMapper(num, patlen, mappings);

};

//var addTuplets = function(block, tuple, prob, tupprob) {
//    var pat = block;
//    var emptyTuple = [];
//    for (var t = 0; t < tuple; t++) {
//        emptyTuple[t] = "|";
//    }
//    for (var p = 0; p < pat.length; p++) {
//        if (getChoice(tupprob)) {
//            pat[p] = addRandomNotes(emptyTuple, prob);
//        }
//    }
//    return pat;
//};

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

        eopts.mappings = (eopts.map ? [eopts.map] : "sn");

        timers.start("gen-lily");
        metrics.increment('generated', 'lilypond-files');
        var finalPattern = patternToLilypond(pattern, eopts);
        // var finalPattern = patternToLilypond(pattern, {
        //     tempo: eopts.tempo,
        //     mappings: eopts.mappings,
        //     noNames: eopts.noNames,
        //     noMetronome: eopts.noMetronome
        // });

        timers.end("gen-lily");

        if (fs.existsSync(eopts._fullname + ".ly")) {
            resolve();
            return;
        }

        fs.writeFile(eopts._fullname + ".ly", finalPattern, function(error) {
            if (error) {
                Log.error(error);
                reject(error);
                return;
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
                resolve();
                cb();
            });
        });

    });
};

var generateOGG = function(filename) {
    return new Promise(function(resolve, reject) {

        if (fs.existsSync(filename + ".ogg")) {
            resolve();
            return;
        }

        timers.start("gen-ogg");
        metrics.increment('generated', 'audio');
        q.push(function(cb) {
            var audiochild;
            audiochild = exec("timidity --preserve-silence -EFreverb=0 -A120 -OvM1 " + filename + ".midi", function(error, stdout, stderr) {
                timers.end("gen-ogg");
                Log.debug('stdout: ' + stdout);
                Log.debug('stderr: ' + stderr);
                if (error !== null) {
                    Log.error('exec error: ' + error);
                    reject(error);
                    return;
                }
                resolve();
                cb();
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
            generatePNG(eopts._fullname).then(function() {
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

    //if (eopts._fullname) {
    //    return eopts;
    //}

    var filenames_pre = exportBlocks(pattern) + (eopts.noMetronome ? '-nometro' : '-metro') + '-' + eopts.tempo;
    var filenames_pre_notempo = exportBlocks(pattern) + (eopts.noMetronome ? '-nometro' : '-metro');
    var fullname = dir_prefix + filenames_pre;
    var fullname_notempo = dir_prefix + filenames_pre_notempo;
    eopts._fullname = fullname;
    eopts._fullname_notempo = fullname_notempo;
    eopts._filenames_pre = filenames_pre;
    eopts._filenames_pre_notempo = filenames_pre_notempo;
    eopts._pattern = pattern;

    return eopts;
};

var getOrMakeFile = function(res, pattern, eopts, cb) {
    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    generateAllFiles(pattern, eopts).then(function() {
        cb();
    }).catch(function(e) {
        Log.error(e);
        res.status(500);
        res.send(e);
    });

};

var getAudio = function(res, pattern, eopts) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    getOrMakeFile(res, pattern, eopts, function() {
        generateOGG(eopts._fullname).then(function() {
            getAudioData(res, pattern, eopts);
        }).catch(function(e) {
            Log.error(e);
        });
    });
};

var getAudioData = function(res, pattern, eopts) {

    try {
        timers.start("buf-ogg");
        fs.readFile(eopts._fullname + ".ogg", function(err, data) {
            if (err) {
                Log.error(err);
                res.status(500);
                res.send({
                    error: err
                });
                return;
            }

            timers.end("buf-ogg");
            Log.debug(data);

            if (!data) {
                res.status(404);
                res.send("Audio file not found!");
            }

            if (eopts.asBase64) {
                res.writeHead(200, {
                    'Content-Type': 'text/plain'
                });
                var datString = "data:audio/ogg;base64," + data.toString("base64");
                res.end(datString);
            } else {
                res.writeHead(200, {
                    'Content-Type': 'audio/ogg'
                });
                res.end(data);
            }

        });
    } catch (e) {
        Log.error(e);
        res.status(500);
        res.send(e);
    }
};

var getImage = function(res, pattern, eopts) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    getOrMakeFile(res, pattern, eopts, function() {
        getImageData(res, pattern, eopts);
    });
};

var getImageData = function(res, pattern, eopts) {

    timers.start("buf-img");
    fs.readFile(eopts._fullname + ".png", function(err, buf) {

        if (err) {
            Log.error(err);
            res.status(500);
            res.send("image generation error: " + err);
            return;
        }

        timers.end("buf-img");

        if (eopts.asBase64) {
            var imageAsBase64 = "data:image/png;base64," + buf.toString("base64");
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.end(imageAsBase64);
        } else {
            res.writeHead(200, {
                'Content-Type': 'image/png'
            });
            res.end(buf);
        }
    });

    return;

};


//var generateBlocks = function(options) {
//    options = getDefaultOptions(options);
//
//    var blocks = parseInt((Math.random() * (options.maxNotes - options.minNotes + 1)) + options.minNotes);
//
//    var pattern = [];
//    pattern[0] = makeCleanBlock(blocks);
//    pattern[1] = makeCleanBlock(blocks);
//    pattern[2] = makeCleanBlock(blocks);
//    pattern[3] = makeCleanBlock(blocks);
//
//    pattern[0] = addRandomNotes(pattern[0], 60);
//
//    pattern[0] = addTuplets(pattern[0], 3, 60, 15);
//    pattern[0] = addTuplets(pattern[0], 5, 60, 5);
//    pattern[0] = addTuplets(pattern[0], 7, 60, 25);
//    pattern[0] = addTuplets(pattern[0], 2, 75, 75);
//
//    pattern[1] = addRandomNotes(pattern[1], 60);
//    pattern[1] = addTuplets(pattern[1], 3, 60, 15);
//
//    pattern[2] = addRandomNotes(pattern[2], 60);
//    pattern[2] = addTuplets(pattern[2], 3, 60, 75);
//    pattern[2] = addTuplets(pattern[2], 4, 60, 75);
//
//    pattern[3] = addRandomNotes(pattern[3], 60);
//    pattern[3] = addTuplets(pattern[3], 4, 60, 75);
//
//    var outFile = patternToLilypond(pattern, {
//        tempo: options.tempo
//    });
//
//    Log.trace(outFile);
//
//    return pattern;
//};

var lpad = function(value, padding) {
    var zeroes = "0";

    for (var i = 0; i < padding; i++) {
        zeroes += "0";
    }

    return (zeroes + value).slice(padding * -1);
};

var convertNumSimple = function(num, patlen) {
    var mappings = ['-', 'r', 'R', 'l', 'L'];

    patlen = patlen || 8;

    var ret = exportBlocks([genericMapper(num, patlen, mappings)]);
    return ret;
};

var convertNum = function(req, res, num, patlen, tuples) {
    var simpleBlocks = convertNumSimple(num, patlen);

    if (tuples) {
        var tupMap = tuples.split(",");

        console.log(tupMap);
        // TODO
    }
    res.send(simpleBlocks);

};

var convertMulti = function(req, res, num, patlen) {
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
    res.send(ret);
};

var getAll8 = function(req, res) {
    var patlen = req.params['patlen'] || 4;
		var pagenum = req.query['page'] || 1;
		pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
		pagenum = Math.abs(pagenum);
    patlen = isNaN(patlen) ? 4 : patlen;
    patlen = Math.abs(patlen % 17);
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
		if(pagenum > maxPages){
			pagenum = 1;
		}
		var mxpat = pagenum * config.worksheet.pageItems;
		if (mxpat > maxPatterns){
			mxpat = maxPatterns;
		}

    var pageHost = config.server.fullhost;

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Connection': 'Transfer-Encoding'
    });
		
		var prevPageLink = pageHost + "/worksheet/" + patlen + "?page=" + (pagenum - 1) + pageLinkAdd;
		var nextPageLink = pageHost + "/worksheet/" + patlen + "?page=" + (pagenum + 1) + pageLinkAdd;
		var footerData = "Page " + pagenum + " of " + maxPages;
		pageStart = pageStart.replace("{{PREVPAGE}}", prevPageLink);
		pageStart = pageStart.replace("{{NEXTPAGE}}", nextPageLink);
		pageEnd = pageEnd.replace("{{PAGENUM}}", footerData);

    res.write(pageStart);
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
            res.write("<div><img src='" + pageHost + "/image?noname=true&nometro=true&pat=" + exportBlocks(sipattern) + "' /></div>" + nl);
            res.flush();
            written += 1;
        } else {
            res.write(pageEnd);
            res.end();
            clearInterval(bufferWriteInterval);
        }
    }, 30);

};
////var all8Cache = {};
//var getAll8old = function(req, res) {
//    var patlen = req.params['patlen'] || 4;
//    patlen = isNaN(patlen) ? 4 : patlen;
//    patlen = Math.abs(patlen % 10);
//    var barlen = patlen;
//
//    //if (all8Cache['permsheet' + barlen]) {
//    //    res.end(all8Cache['permsheet' + barlen]);
//    //    return;
//    //}
//
//    var pagebody = fs.readFileSync('static/permutationsheet.html', 'utf8');
//    //var mappings = ['-', 'x', 'X', 'r', 'R', 'l', 'L'];
//    var mappings = [];
//    if (req.query['feets']) {
//        mappings = ['r', 'R', 'l', 'L', 'f', 'F', 'h', 'H'];
//    } else {
//        mappings = ['r', 'R', 'l', 'L'];
//    }
//    if (req.query["rest"]) {
//        mappings.push("-");
//    }
//
//    var pattern = [];
//    var sipattern = [];
//    pattern[0] = makeCleanBlock(8);
//    sipattern[0] = makeCleanBlock(8);
//
//    var notetypes = mappings.length;
//    var mxpat = Math.pow(notetypes, barlen);
//    //var page = "";
//
//    var pageHost = 'https://drumgen.apollolms.co.za'; // req.get('host');
//
//    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
//    var pageStart = pageSplits[0];
//    var pageEnd = pageSplits[1];
//
//    res.writeHead(200, {
//        'Content-Type': 'text/html; charset=utf-8',
//        'Transfer-Encoding': 'chunked',
//        'Connection': 'Transfer-Encoding'
//    });
//
//    res.write(pageStart);
//    var written = 0;
//    for (var mxo = 0; mxo < mxpat; mxo++) {
//        (function(mx) {
//            setTimeout(function() {
//                var cpat = (mx).toString(notetypes);
//                cpat = lpad(cpat, barlen);
//                pattern[mx] = cpat.split("");
//                for (var px in pattern[mx]) {
//                    pattern[mx][px] = mappings[pattern[mx][px]];
//                }
//                sipattern[0] = pattern[mx];
//                //page += "<div><img src='" + pageHost + "/image?noname=true&nometro=true&pat=" + exportBlocks(sipattern) + "' /></div>" + nl;
//                res.write("<div><img src='" + pageHost + "/image?noname=true&nometro=true&pat=" + exportBlocks(sipattern) + "' /></div>" + nl);
//                res.flush();
//                written += 1;
//            }, 50);
//        })(mxo);
//    }
//
//    //pagebody = pagebody.replace("{{MAINHOLDER_DATA}}", page);
//    //   all8Cache['permsheet' + barlen] = pagebody;
//    var endInterval = setInterval(function() {
//        if (written >= mxpat - 1) {
//            res.write(pageEnd);
//            res.end();
//            clearInterval(endInterval);
//        }
//    }, 150);
//    //res.end(pagebody);
//
//};

module.exports = {
    importBlocks: importBlocks,
    exportBlocks: exportBlocks,
    //    generateBlocks: generateBlocks,
    getImage: getImage,
    getAudio: getAudio,
    //    getPage: getPage,
    getAll8: getAll8,
    getMappedTuple: getMappedTuple,
    convertNumToTuple: convertNumToTuple,
    convertNum: convertNum,
    convertNumSimple: convertNumSimple,
    convertMulti: convertMulti,
    lpad: lpad,
};
