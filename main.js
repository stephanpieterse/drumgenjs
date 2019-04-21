/* global Buffer, require, module, setInterval, clearInterval */
/* jslint strict:false */

var gm = require("gm");
// var sys = require('util');
var exec = require('child_process').exec;
var fs = require('fs');
var util = require('./util.js');
var cache = util.cache;
var config = require('./config.js');

var queue = require('queue');

var q = new queue();
q.timeout = config.queue.timeout;
q.concurrency = config.queue.concurrency;
q.autostart = true;

var Log = require('./logger.js');

var dir_prefix = "/opt/app/tmpgen/";

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
        //if (blocks[b] instanceof Array) {
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

var genMetronomePart = function(patlen) {
    var metro = "";
    metro += "\\new DrumStaff" + "\n";
    metro += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 \\override Stem.Y-extent = ##f " + 'instrumentName = #"Metronome"' + " }" + "\n";
    metro += "{" + "\n";
    metro += "\\time " + patlen + "/4" + nl;
    metro += "\\drummode {";
    for (var w = 0; w < patlen; w++) {
        metro += "<< {wbl4 } >> ";
    }
    metro += "}" + nl;
    metro += "}" + nl;
    return metro;
};

var getLilypondHeader = function() {
    var head = "";
    head += "\\version \"2.18.2\" " + nl;
    var defDrums = "#(define mydrums '( (hihat  cross   #f  0) ))";
    head += defDrums;
    head += "\\score {" + nl;
    return head;
};

var patternToLilypond = function(blocks, options) {
    options = getDefaultOptions(options);

    var mappings = ["hh", "sn", "bd", "hh"];

    if (options.mappings && options.mappings[0]) {
        mappings = options.mappings;
    }

    var staffnames = ["HiHat", "Snare", "Bass Drum", "HH Foot"];
    if (options.noNames) {
        staffnames = ["", "", "", ""];
    }

    // set defaults
    options.tempo = options.tempo || 100;
    var patlen = blocks[0].length;

    var file = "";

    file += getLilypondHeader();

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
        file += genLilypondPart(blocks[block], mappings[block]);
        file += "}" + nl;
        file += "}" + nl;
    }
    file += ">>" + nl;

    if (!options.noMetronome) {
        file += genMetronomePart(patlen);
    }

    file += ">>" + nl;
    file += "\\layout { }" + nl;
    file += "\\midi { }" + nl;
    file += "}";
    return file;
};

var getChoice = function(probable) {
    var c = Math.random() * 100;
    if (c > probable) {
        return 0;
    } else {
        return 1;
    }
};

var makeCleanBlock = function(blocks) {
    var pat = [];
    for (var b = 0; b < blocks; b++) {
        pat[b] = '|';
    }

    return pat;
};

var addRandomNotes = function(block, prob) {
    var pat = block;

    for (var p = 0; p < pat.length; p++) {
        if (getChoice(prob)) {
            pat[p] = 'x';
        } else {
            pat[p] = '-';
        }
    }

    return pat;
};

var genericMapper = function(num, patlen, mappings) {

    var cachedid = "genmapper" + JSON.stringify(arguments);
    var cid = cache.get(cachedid);

    if (cid) {
        Log.debug({
            cacheitem: cid,
            id: cachedid
        }, "returning map from cache");
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
    }, "setting item in cache");
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

var addTuplets = function(block, tuple, prob, tupprob) {
    var pat = block;
    var emptyTuple = [];
    for (var t = 0; t < tuple; t++) {
        emptyTuple[t] = "|";
    }
    for (var p = 0; p < pat.length; p++) {
        if (getChoice(tupprob)) {
            pat[p] = addRandomNotes(emptyTuple, prob);
        }
    }
    return pat;
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

var getDefaultOptions = function(options) {
    options = options || {};
    options.maxNotes = options.maxNotes || 8;
    options.minNotes = options.minNotes || 4;
    options.tempo = options.tempo || 100;
    return options;
};

var getPage = function(req, res, pattern) {
    var page = "<html><head><title>Pattern for you</title>";
    page += "<style>";
    page += ".mainHolder { text-align: center; }";
    page += "audio { width: 100%; }";
    page += "</style>";
    page += "</head><body>";
    page += "<div id='mainHolder'>";
    page += "<img src='http://" + req.get('host') + "/image?pat=" + exportBlocks(pattern) + "' />";
    page += "<br/>";
    page += "<audio controls><source src='http://" + req.get('host') + "/audio?pat=" + exportBlocks(pattern) + "' type='audio/ogg'> </audio>";
    page += "</div>";
    page += "</body></html>";
    res.end(page);
};


var generateLilypond = function(pattern, eopts) {
    return new Promise(function(resolve, reject) {

        var options = getDefaultOptions();
        var finalPattern = patternToLilypond(pattern, {
            tempo: options.tempo,
            mappings: [eopts.map],
            noNames: eopts.noNames,
            noMetronome: eopts.noMetronome
        });

        var filenames_pre = exportBlocks(pattern);
        var fullname = dir_prefix + filenames_pre;

        if (fs.existsSync(fullname + ".ly")) {
            resolve();
            return;
        }

        fs.writeFile(fullname + ".ly", finalPattern, function(error) {
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

        var genchild;
        q.push(function(cb) {
            //genchild = exec("cd " + dir_prefix + " && lilypond --png -dresolution=190 '" + filename + ".ly' && convert " + filename + ".png -crop 2048x500+0+0 -trim +repage " + filename + ".s.png", function(error, stdout, stderr) {
            genchild = exec("cd " + dir_prefix + " && ../lilyclient.sh --png '" + filename + ".ly' && convert " + filename + ".png -crop 2048x500+0+0 -trim +repage " + filename + ".s.png", function(error, stdout, stderr) {
                Log.trace('stdout: ' + stdout);
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

        var audiochild;
        audiochild = exec("timidity -EFreverb=0 -Ov " + filename + ".midi", function(error, stdout, stderr) {
            Log.debug('stdout: ' + stdout);
            Log.debug('stderr: ' + stderr);
            if (error !== null) {
                Log.error('exec error: ' + error);
                reject(error);
                return;
            }
            resolve();
        });
    });
};

var generateAllFiles = function(pattern, eopts) {

    var cacheName = "cache-gen-prom-" + pattern + JSON.stringify(eopts);
    var cachedItem = cache.get(cacheName);

    if (cachedItem) {
        return cachedItem;
    }

    var prom = new Promise(function(resolve, reject) {
        var filenames_pre = exportBlocks(pattern);
        var fullname = dir_prefix + filenames_pre;
        generateLilypond(pattern, eopts).then(function() {
            generatePNG(fullname).then(function() {
                generateOGG(fullname).then(function() {
                    resolve();
                }).catch(function(e) {
                    reject(e);
                });
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

var getOrMakeFile = function(res, pattern, eopts, cb) {
    generateAllFiles(pattern, eopts).then(function() {
        cb();
    }).catch(function(e) {
        Log.error(e);
        res.status(500);
        res.send(e);
    });

};

var getAudio = function(res, pattern, eopts) {

    eopts = eopts || {};
    getOrMakeFile(res, pattern, eopts, function() {
        getAudioData(res, pattern, eopts);
    });

};

var getAudioData = function(res, pattern, eopts) {

    var filenames_pre = exportBlocks(pattern);

    try {
        fs.readFile(dir_prefix + filenames_pre + ".ogg", function(err, data) {
            if (err) {
                Log.error(err);
                res.status(500);
                res.send({
                    error: err
                });
                return;
            }

            Log.debug(data);

            if (!data) {
                res.status(404);
                res.send("audio file not found!");
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

    eopts = eopts || {};
    getOrMakeFile(res, pattern, eopts, function() {
        getImageData(res, pattern, eopts);
    });
};

var getImageData = function(res, pattern, eopts) {

    var filenames_pre = exportBlocks(pattern);
    var fullname = dir_prefix + filenames_pre;

    var cacheName = "image" + fullname + "png";
    var ck = cache.get(cacheName);


    if (ck) {
        if (eopts.asBase64) {
            var imageAsBase64 = "data:image/png;base64," + ck.toString("base64");
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });

            res.end(imageAsBase64);
        } else {
            res.writeHead(200, {
                'Content-Type': 'image/png'
            });
            res.end(ck);
        }

        return;
    }

    var mimg = gm(fullname + ".s.png").limit('memory', '48M');
    //mimg.crop(2048, 500, 0, 0)
    //    .trim()
    mimg
        .toBuffer('PNG', function(err, buf) {

            if (err) {
                Log.error(err);
                res.status(500);
                res.send("image generation error: " + err);
                return;
            }

            cache.set(cacheName, buf);

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

function getRandomInt(min, max) {
    min = min || 0;
    max = max || 1;
    return parseInt((Math.random() * (max - min)) + min);
}

var generateBlocks = function(options) {
    options = getDefaultOptions(options);

    var blocks = parseInt((Math.random() * (options.maxNotes - options.minNotes + 1)) + options.minNotes);

    var pattern = [];
    pattern[0] = makeCleanBlock(blocks);
    pattern[1] = makeCleanBlock(blocks);
    pattern[2] = makeCleanBlock(blocks);
    pattern[3] = makeCleanBlock(blocks);

    pattern[0] = addRandomNotes(pattern[0], 60);

    pattern[0] = addTuplets(pattern[0], 3, 60, 15);
    pattern[0] = addTuplets(pattern[0], 5, 60, 5);
    pattern[0] = addTuplets(pattern[0], 7, 60, 25);
    pattern[0] = addTuplets(pattern[0], 2, 75, 75);

    pattern[1] = addRandomNotes(pattern[1], 60);
    pattern[1] = addTuplets(pattern[1], 3, 60, 15);

    pattern[2] = addRandomNotes(pattern[2], 60);
    pattern[2] = addTuplets(pattern[2], 3, 60, 75);
    pattern[2] = addTuplets(pattern[2], 4, 60, 75);

    pattern[3] = addRandomNotes(pattern[3], 60);
    pattern[3] = addTuplets(pattern[3], 4, 60, 75);

    var outFile = patternToLilypond(pattern, {
        tempo: options.tempo
    });

    Log.trace(outFile);

    return pattern;
};

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

var getAccent = function(req, res) {
    var mappings = ['-', 'r', 'R', 'l', 'L'];

    var pattern = [];
    var sipattern = [];
    pattern[0] = makeCleanBlock(8);
    sipattern[0] = makeCleanBlock(8);

    var barlen = getRandomInt(4, 8);
    var notetypes = mappings.length;
    var mxpat = Math.pow(notetypes, barlen);
    var randPat = getRandomInt(0, mxpat);
    var page = "<html><head><title>Random Accent</title>";
    page += "<style>";
    page += ".mainHolder { text-align: center; }";
    page += "audio { width: 100%; }";
    page += "</style>";
    page += "</head><body>";
    page += "<div id='mainHolder'>";
    var cpat = (randPat).toString(notetypes);
    cpat = lpad(cpat, barlen);
    pattern[0] = cpat.split("");
    for (var px in pattern[0]) {
        pattern[0][px] = mappings[pattern[0][px]];
    }
    sipattern[0] = pattern[0];
    page += "<img src='http://" + req.get('host') + "/image?nometro=true&map=sn&pat=" + exportBlocks(sipattern) + "' />";
    //page += "<audio controls><source src='http://" + req.get('host') + "/audio?pat=" + exportBlocks(pattern) + "' type='audio/ogg'> </audio>";
    page += "<br/>";
    page += "</div>";
    page += "</body></html>";
    res.end(page);
};

var getAll8 = function(req, res) {

    var mappings = ['-', 'x', 'X', 'r', 'R', 'l', 'L'];

    var pattern = [];
    var sipattern = [];
    pattern[0] = makeCleanBlock(8);
    sipattern[0] = makeCleanBlock(8);

    var barlen = 3;
    var notetypes = mappings.length;
    var mxpat = Math.pow(notetypes, barlen);
    var page = "<html><head><title>All 8</title>";
    page += "<style>";
    page += ".mainHolder { text-align: center; }";
    page += "audio { width: 100%; }";
    page += "</style>";
    page += "</head><body>";
    page += "<div id='mainHolder'>";
    for (var mx = 0; mx < mxpat; mx++) {
        var cpat = (mx).toString(notetypes);
        cpat = lpad(cpat, barlen);
        pattern[mx] = cpat.split("");
        for (var px in pattern[mx]) {
            pattern[mx][px] = mappings[pattern[mx][px]];
        }
        sipattern[0] = pattern[mx];
        page += "<img src='http://" + req.get('host') + "/image?pat=" + exportBlocks(sipattern) + "' />";
    }

    page += "<br/>";
    page += "</div>";
    page += "</body></html>";
    res.end(page);

};

module.exports = {
    importBlocks: importBlocks,
    exportBlocks: exportBlocks,
    generateBlocks: generateBlocks,
    getImage: getImage,
    getAudio: getAudio,
    getPage: getPage,
    getAll8: getAll8,
    getAccent: getAccent,
    getMappedTuple: getMappedTuple,
    convertNumToTuple: convertNumToTuple,
    convertNum: convertNum,
    convertNumSimple: convertNumSimple,
    convertMulti: convertMulti,
};
