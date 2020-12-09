/* global Buffer, require, module */
/* jslint strict:false */

var exec = require('child_process').exec;
var fs = require('fs');
var util = require('./util.js');
var cache = util.cache;
var config = require('./config.js');

var timers = require('./timers.js');
var metrics = require('./metrics.js');
var miditools = require('./miditools.js');
var mediautil = require('./mediautil.js');
var common = require('./commonblockfuncs.js');

var Log = require('./logger.js');

var dir_prefix = config.tmpdir;


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
        case "Y":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"l" ' + '\\repeat tremolo 2 ' + repnote + (parseInt(noteBase)*2) + '-"R"-\\omit\\pp' + space;
            break;
        case "y":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"r" ' + '\\repeat tremolo 2 ' + repnote + (parseInt(noteBase)*2) + '-"L"-\\omit\\pp' + space;
            break;
        case "O":
            //var tremtime = noteBase >= 8 ? noteBase*2 : 8;
            //file += repnote + (noteBase) + ':' + tremtime +'-"R"-\\omit\\pp' + space;
            file += '\\repeat tremolo 2 ' + repnote + (parseInt(noteBase)*2) + '-"R"-\\omit\\pp' + space;
            break;
        case "o":
            //var tremtime = noteBase > 8 ? noteBase*2 : 8;
            //file += repnote + (noteBase) + ':' + tremtime +'-"L"-\\omit\\pp' + space;
            file += '\\repeat tremolo 2 ' + repnote + (parseInt(noteBase)*2) + '-"L"-\\omit\\pp' + space;
            break;
        case "I":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"l" ' + repnote + (noteBase) + '^>-"R"-\\omit\\fff' + space;
            break;
        case "i":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"l" ' + repnote + (noteBase) + '-"R"-\\omit\\pp' + space;
            break;
        case "U":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"r" ' + repnote + (noteBase) + '^>-"L"-\\omit\\fff' + space;
            break;
        case "u":
            file += '\\acciaccatura  ' + repnote + (parseInt(noteBase)*2) + '-"r" ' + repnote + (noteBase) + '-"L"-\\omit\\pp' + space;
            break;
        case "L":
            file += repnote + (noteBase) + '^>-"L"-\\omit\\fff' + space;
            break;
        case "l":
            file += repnote + (noteBase) + '-"L"-\\omit\\pp' + space;
            break;
        case "R":
            file += repnote + (noteBase) + '^>-"R"-\\omit\\fff' + space;
            break;
        case "r":
            file += repnote + (noteBase) + '-"R"-\\omit\\pp' + space;
            break;
        case "X":
            file += repnote + (noteBase) + "^>-\\omit\\fff" + space;
            break;
        case "x":
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
    head += "#(ly:set-option 'resolution '1000)" + nl;
    head += "#(ly:set-option 'pixmap-format 'pngmono)" + nl;
    head += "#(ly:set-option 'backend 'eps)" + nl;
    head += "#(ly:set-option 'gs-load-lily-fonts '#t)" + nl;
    head += "#(ly:set-option 'include-eps-fonts '#f)" + nl;
    head += "#(ly:set-option 'aux-files '#f)" + nl;
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
    while (mappings.length < blocks.length) {
        mappings.push(mappings[0]);
    }

    var file = "";
    file += "<<" + nl;

    file += "<<" + nl;
    for (var block in blocks) {
        file += "\\new DrumStaff " + nl;
        file += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 " + 'instrumentName = #"' + staffnames[block] + '"' + " }" + nl;
        file += " { " + nl;
        file += "\\override Stem.direction = #UP" + nl;
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

    if (!options.noMetronome && options._isMidiSection === true) {
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

        if (fs.existsSync(eopts._fullname_notempo + ".ly")) {
            resolve();
            return;
        }

        timers.start("gen-lily");
        metrics.increment('generated', 'lilypond-files');
        var finalPattern = patternToLilypond(pattern, eopts);
        timers.end("gen-lily");

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


var generatePNG = function(filename) {

    return new Promise(function(resolve, reject) {

        if (fs.existsSync(filename + ".png")) {
            resolve();
            return;
        }

        timers.start("gen-png");
        metrics.increment('generated', 'images');
        var genchild;
        try {
            genchild = exec("cd " + dir_prefix + " && bash /opt/app/lilyclient.sh --png '" + filename + ".ly'", {
                timeout: 10000
            }, function(error, stdout, stderr) {
                timers.end("gen-png");
                Log.debug('stdout: ' + stdout);
                Log.debug('stderr: ' + stderr);
                if (error !== null) {
                    Log.error('exec error: ' + error);
                    reject(error);
                    return;
                }
                mediautil.tagPNG(filename).then(function() {
                    resolve();
                }).catch(function() {
                    resolve();
                });
            });
        } catch (e) {
            reject(e);
        }
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
        var audiochild;
        try {
            audiochild = exec("timidity --preserve-silence -EFreverb=0 -A120 -OwM1 " + filename + ".midi &&  sox --combine mix /tmp/silence.wav " + filename + ".wav " + filename + ".ogg trim 0 " + endtime + " ", {
                timeout: 3000
            }, function(error, stdout, stderr) {
                timers.end("gen-ogg");
                Log.debug('stdout: ' + stdout);
                Log.debug('stderr: ' + stderr);
                if (error !== null) {
                    Log.error('exec error: ' + error);
                    reject(error);
                    return;
                }
                mediautil.tagOGG(filename).then(function() {
                    resolve();
                }).catch(function() {
                    resolve();
                });
            });
        } catch (e) {
            reject(e);
        }
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

    var nameOpts = [eopts.map, eopts.pattern, eopts.noMetronome];
    var fullBuffedOpts = Buffer.from(JSON.stringify(nameOpts)).toString('hex');
    var filenames_pre_notempo = fullBuffedOpts + common.exportBlocks(pattern) + (eopts.noMetronome ? '-nometro' : '-metro');
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
        var patendtime = (60 / eopts.tempo) * eopts._pattern[0].length * repeatCount;
        generateOGG(eopts._fullname, patendtime).then(function() {
            getAudioData(pattern, eopts, function(err, auData) {
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

        if (makeErr) {
            Log.error(makeErr);
            cb(makeErr);
            return;
        }

        getImageData(pattern, eopts, function(err, imgData) {
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

var getLilypond = function(pattern, eopts, cb) {
    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    generateLilypond(pattern, eopts).then(function() {
        fs.readFile(eopts._fullname_notempo + ".ly", function(err, buf) {
            cb(err, buf);
        });
    }).catch(function(e) {
        cb(e);
    });
};

var healthyLilypondCheck = function(cb) {
    var genchild;
    var state = {
        up: true,
        fatal: false,
        reason: ""
    };
    try {
        Log.debug('Running healthcheck...');
        genchild = exec("cd " + dir_prefix + " && bash /opt/app/lilyclient.sh --png /tmp/healthtest.ly", {
            timeout: 5000
        }, function(error, stdout, stderr) {
            Log.debug('stdout: ' + stdout);
            Log.debug('stderr: ' + stderr);
            if (error !== null) {
                Log.error('exec error: ' + error);
                state.reason = error;
                state.up = false;
                state.fatal = true;
            }
            cb(state);
        });
    } catch (e) {
        Log.error(e);
        state.reason = e;
        state.up = false;
        state.fatal = true;
        cb(state);
    }
};

module.exports = {
    getImage: getImage,
    getAudio: getAudio,
    getRawFile: getLilypond,
    healthCheck: healthyLilypondCheck,
};
