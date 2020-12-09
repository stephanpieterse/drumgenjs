/* global Buffer, require, module, setInterval, clearInterval */
/* jslint strict:false */

var exec = require('child_process').exec;
var fs = require('fs');
var util = require('./util.js');
var cache = util.cache;
var config = require('./config.js');

var timers = require('./timers.js');
var miditools = require('./miditools.js');
var common = require('./commonblockfuncs.js');
var mediautil = require('./mediautil.js');
var xml2js = require('xml2js');

var Log = require('./logger.js');

var dir_prefix = config.tmpdir;

var repeatCount = 1;

var noteNameLookup = {
    '4': 'quarter',
    '8': 'eighth',
    '16': '16th',
    '32': '32nd',
};

var findOptimalNoteDivision = function(blocks) {
    // how do we do this for nested?
    var tuples = [];
    for (var b in blocks) {
        tuples.push(blocks[b].length);
    }
    var mults = [];
    for (var t in tuples) {
        if (mults.indexOf(tuples[t]) === -1) {
            mults.push(tuples[t]);
        }
    }
    var division = mults.reduce(function(t, v) {
        return t * v;
    });
    return division;
};

var genMusicXmlTupleMapper = function(blocks, repnote, noteBase, tupnestlevel, thisDiv) {
    var normDiv = [2, 4, 8, 16];
    var notes = [];

    var noteDuration = thisDiv / blocks.length;

    for (var b = 0; b < blocks.length; b++) {
        if (Array.isArray(blocks[b])) {
            var noteDur = "" + noteBase;
            var tupNum = blocks[b].length;
            if (normDiv.indexOf(tupNum) !== -1) {
                noteDur = "" + (tupNum * noteBase);
            } else {
                // file += "\\tuplet " + tupNum + "/2 " + "\n";
                noteDur = "" + (noteDur * 2);
            }

            noteBase = noteBase * 2;
            var tupnotes = genMusicXmlTupleMapper(blocks[b], repnote, parseInt(noteDur), tupnestlevel + 1, noteDuration);
            var tupnestnumber = '' + b + tupnestlevel;
            tupnotes[0].notations = tupnotes[0].notations || {};
            tupnotes[0].notations.tuplet = [{
                $: {
                    'type': 'start',
                    'number': tupnestnumber
                }
            }];

            var lastitem = tupnotes.length - 1;
            tupnotes[lastitem].notations = tupnotes[lastitem].notations || {};
            tupnotes[lastitem].notations.tuplet = tupnotes[lastitem].notations.tuplet || [];
            tupnotes[lastitem].notations.tuplet.push({
                $: {
                    'type': 'stop',
                    'number': tupnestnumber
                }
            });

            notes = notes.concat(tupnotes);
        } else {
            notes.push(genMusicXmlSingleMapper(blocks[b], repnote, noteBase, noteDuration));
        }
    }

    return notes;
};


var genMusicXmlSingleMapper = function(blockb, repnote, noteBase, noteDuration) {
    var noteObj = {};

    //noteObj.pitch = {'step':'E','octave':'4'};
    noteObj.unpitched = {
        'display-step': 'E',
        'display-octave': '4'
    };
    noteObj.duration = noteDuration;
    noteObj.instrument = {
        $: {
            'id': 'P1-I77'
        }
    };
    noteObj.voice = 1;
    noteObj.type = noteNameLookup[noteBase];
    noteObj.dynamics = "0.5";
    noteObj.stem = 'down';
    switch (blockb) {
        case "L":
            noteObj.dynamics = "0.9";
            noteObj.notations = {
                'articulations': {
                    'accent': {}
                }
            };
            noteObj.lyric = {
                'text': blockb.toUpperCase(),
                'syllabic': 'single'
            };
            break;
        case "l":
            noteObj.lyric = {
                'text': blockb.toUpperCase(),
                'syllabic': 'single'
            };
            break;
        case "R":
            noteObj.dynamics = "0.9";
            noteObj.notations = {
                'articulations': {
                    'accent': {}
                }
            };
            noteObj.lyric = {
                'text': blockb.toUpperCase(),
                'syllabic': 'single'
            };
            break;
        case "r":
            noteObj.lyric = {
                'text': blockb.toUpperCase(),
                'syllabic': 'single'
            };
            break;
        case "X":
            noteObj.dynamics = "0.9";
            noteObj.notations = {
                'articulations': {
                    'accent': {}
                }
            };
            break;
        case "x":
            break;
        case "-":
            noteObj.rest = {};
            break;
    }
    //{'pitch': {
    //                            'step': 'D',
    //                            'octave': '3'
    //                        },
    //                        'duration': '2',
    //                        'type': 'half'
    //                    }
    //     <notations>
    //          <articulations>
    //            <accent default-x="-1" default-y="-55" placement="below"/>
    //          </articulations>
    //        </notations>

    //   <lyric default-y="-80" number="1">
    //     <syllabic>single</syllabic>
    //     <text>Dans</text>
    //   </lyric>
    return noteObj;
};



var genMusicXmlPart = function(blocks, repnote, noteBase, thisDiv) {
    var notes = [];
    var normDiv = [2, 4, 8, 16];
    noteBase = noteBase || 4;
    var plainTuple;

    var tupnestlevel = 1;
    var noteDuration = thisDiv;
    // for nested and nice stuff, we need to
    // split the arr and normal mapping into
    // two functions so we can recurse

    for (var b = 0; b < blocks.length; b++) {
        if (Array.isArray(blocks[b])) {
            var noteDur = "" + noteBase;
            var tupNum = blocks[b].length;
            if (normDiv.indexOf(tupNum) !== -1) {
                noteDur = "" + (tupNum * noteBase);
                plainTuple = true;
            } else {
                // file += "\\tuplet " + tupNum + "/2 " + "\n";
                noteDur = "" + (noteDur * 2);
                plainTuple = false;
            }
            var tupnotes = genMusicXmlTupleMapper(blocks[b], repnote, parseInt(noteDur), tupnestlevel + 1, noteDuration);
            if (!plainTuple) {
                // on first note of retrun
                //  <notations>
                //        <tuplet bracket="yes" number="1" placement="above" type="start"/>
                //      </notations>

                var tupnestnumber = '' + b + tupnestlevel;
                tupnotes[0].notations = tupnotes[0].notations || {};
                tupnotes[0].notations.tuplet = [{
                    $: {
                        'type': 'start',
                        'number': tupnestnumber
                    }
                }];


                //       <tuplet-actual>
                //           <tuplet-number>3</tuplet-number>
                //           <tuplet-type>eighth</tuplet-type>
                //         </tuplet-actual>

                var lastitem = tupnotes.length - 1;
                tupnotes[lastitem].notations = tupnotes[lastitem].notations || {};
                tupnotes[lastitem].notations.tuplet = tupnotes[lastitem].notations.tuplet || [];
                tupnotes[lastitem].notations.tuplet.push({
                    $: {
                        'type': 'stop',
                        'number': tupnestnumber
                    }
                });
                // on last not of terutn
                //    <notations>
                //         <tuplet number="1" type="stop"/>
                //       </notations>


                for (var t in tupnotes) {
                    //     <time-modification>
                    //         <actual-notes>9</actual-notes>
                    //         <normal-notes>4</normal-notes>
                    //         <normal-type>quarter</normal-type>
                    //       </time-modification>


                    // nested tuples get confusing cuz we need to calc how many
                    // notes there would be if the entire tuple was subbed
                    tupnotes[t]['time-modification'] = {
                        'actual-notes': tupNum,
                        'normal-notes': 2
                    };
                }

            } else {
                for (var u in tupnotes) {
                    //    tupnotes[u]['duration'] = tupnotes[u]['duration'] / tupNum;
                }
            }
            notes = notes.concat(tupnotes);
        } else {
            notes.push(genMusicXmlSingleMapper(blocks[b], repnote, noteBase, noteDuration));

        }
    }
    return notes;
};



// var genMetronomePart = function(patlen, eopts) {
var genMetronomePart = function(patlen) {
    var notes = [];
    for (var w = 1; w < patlen; w++) {
        var noteObj = {};

        noteObj.unpitched = {
            'display-step': 'A',
            'display-octave': '2'
        };
        noteObj.duration = 1; // who knows what a duration is
        noteObj.type = 'quarter';
        notes.push(noteObj);
    }
    return notes;
    //    metro += "\\new DrumStaff" + "\n";
    //    metro += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 \\override Stem.Y-extent = ##f " + 'instrumentName = #"Metronome"' + " \\override Stem #'(details beamed-lengths) = #'(2) }" + "\n";
    //    metro += "{" + "\n";
    //    metro += "\\time " + patlen + "/4" + nl;
    //    metro += "\\drummode {" + nl;
    //    metro += "\\repeat volta " + repeatCount + " << {";
    //    metro += " wbh4 ";
    //    for (var w = 1; w < patlen; w++) {
    //        metro += " wbl4 ";
    //    }
    //    metro += " } >>" + nl;
    //    metro += "}" + nl;
    //    metro += "}" + nl;
};


var genMusicBlockSection = function(blocks, options) {

    var mappings = options.mappings;
    var staffnames = options._staffnames;
    var patlen = blocks[0].length;

    while (mappings.length < blocks.length) {
        mappings.push(mappings[0]);
    }

    var notes = [];
    for (var block in blocks) {
        var optDiv = findOptimalNoteDivision(blocks[block]);
        var thisPart = genMusicXmlPart(blocks[block], mappings[block], 4, parseInt(optDiv));
        notes.push(thisPart);
    }


    //for (var block in blocks) {
    //    file += "\\new DrumStaff " + nl;
    //    file += "\\with { drumStyleTable = #percussion-style \\override StaffSymbol.line-count = #1 " + 'instrumentName = #"' + staffnames[block] + '"' + " }" + nl;
    //    file += " { " + nl;
    //    file += "\\omit Score.MetronomeMark" + nl;
    //    file += "\\time " + patlen + "/4" + nl;
    //    file += "\\set DrumStaff.drumStyleTable = #(alist->hash-table mydrums)" + nl;
    //    if (options.tempo) {
    //        file += "\\tempo 4 = " + options.tempo + nl;
    //    }
    //    file += "\\drummode {" + nl;
    //    file += "\\repeat volta " + repeatCount + " ";
    //    file += genLilypondPart(blocks[block], mappings[block]);
    //    file += "}" + nl;
    //    file += "}" + nl;
    //}

    return notes;
};

var getMusicXmlTestObj = function() {
    return getMusicXmlBase({
        tempo: 100
    });
};

var getMusicXmlBase = function(eopts) {

    //    36 Bass Drum 1
    //    37 Side Stick/Rimshot
    //    38 Acoustic Snare
    //    39 Hand Clap
    //    41 Low Floor Tom
    //    42 Closed Hi-hat
    //    44 Pedal Hi-hat
    //    45 Low Tom
    //    47 Low-Mid Tom
    //    48 Hi-Mid Tom
    //    50 High Tom
    //    53 Ride Bell
    //    54 Tambourine
    //    56 Cowbell
    //    60 High Bongo
    //    61 Low Bongo
    //    62 Mute High Conga
    //    63 Open High Conga
    //    64 Low Conga
    //    65 High Timbale
    //    66 Low Timbale
    //    75 Claves
    //    76 High Wood Block
    //    77 Low Wood Block


    // repeats to be added as part of measures
    //   <barline location="left">
    //     <bar-style>heavy-light</bar-style>
    //     <repeat direction="forward"/>
    //   </barline>
    // 
    //  <barline location="right">
    //     <bar-style>light-heavy</bar-style>
    //     <repeat direction="backward"/>
    //   </barline>
    // 

    // in score-poart
    //    <midi-instrument id="P2-X1">
    //      <midi-channel>10</midi-channel>
    //      <midi-program>1</midi-program>
    //      <midi-unpitched>57</midi-unpitched>
    //    </midi-instrument>
    var baseObj = {
        'score-partwise': [{
            'part-list': {
                'score-part': {
                    '$': {
                        id: "P1"
                    },
                    'part-name': 'Drums',
                    'score-instrument': [{
                        $: {
                            'id': 'P1-I77'
                        },
                        'instrument-name': 'Woodblock'
                    }],
                    'midi-instrument': {
                        $: {
                            'id': 'P1-I77'
                        },
                        'midi-channel': '10',
                        'midi-program': '1',
                        'midi-unpitched': '77',
                        'volume': '95'
                    }
                }
            }
        }, {
            'part': {
                '$': {
                    id: 'P1'
                },

                'measure': [{
                    '$': {
                        'number': "1"
                    },
                    'attributes': {
                        'divisions': 1,
                        'key': {
                            'fifths': 0
                        },
                        'time': {
                            'beats': 4,
                            'beat-type': 4
                        },
                        'instruments': 1,
                        'clef': {
                            'sign': 'percussion',
                            'line': 2
                        },
                        'staff-details': {
                            'staff-lines': '1'
                        }
                    },
                    //  'direction':{
                    //    $:{'placement':'above'}
                    //  },
                    'sound': {
                        $: {
                            'tempo': eopts.tempo
                        }
                    },
                    'note': []

                }]
            }
        }]
    };

    //'note': {
    //    'pitch': {
    //        'step': 'C',
    //        'octave': '4'
    //    },
    //    'duration': '4',
    //    'type': 'whole'
    //}
    return baseObj;
};

var patternToMusicXml = function(blocks, options) {

    options = getDefaultOptions(options);
    var staffnames = ["HiHat", "Snare", "Bass Drum", "HH Foot"];
    if (options.noNames) {
        staffnames = ["", "", "", ""];
    }
    options._staffnames = staffnames;

    var xmlObj = JSON.parse(JSON.stringify(getMusicXmlBase(options)));
    var partNotes = genMusicBlockSection(blocks, options);

    xmlObj['score-partwise'][1]['part']['measure'][0]['note'] = partNotes[0];
    xmlObj['score-partwise'][1]['part']['measure'][0]['attributes']['divisions'] = findOptimalNoteDivision(blocks[0]);
    if (!options.noMetronome) {
        var patlen = blocks[0].length;
        var metroNotes = genMetronomePart(patlen, options);
    }
    return xmlObj;
};

var getDefaultOptions = function(eopts) {
    var options = JSON.parse(JSON.stringify(eopts)) || {};
    options.maxNotes = options.maxNotes || 8;
    options.minNotes = options.minNotes || 4;
    options.tempo = isNaN(parseInt(eopts.tempo)) ? 100 : parseInt(eopts.tempo);
    return options;
};

var generateMusicXml = function(pattern, eopts) {
    return new Promise(function(resolve, reject) {

        eopts = getDefaultOptions(eopts);
        eopts = generateFilename(pattern, eopts);

        eopts.mappings = (eopts.map ? (Array.isArray(eopts.map) ? eopts.map : eopts.map.split(',')) : ["sn"]);

        var fileExt = ".musicxml";
        if (fs.existsSync(eopts._fullname_notempo + fileExt)) {
            resolve();
            return;
        }

        timers.start("gen-musicxml");
        var finalPatternObj = patternToMusicXml(pattern, eopts);

        var builder = new xml2js.Builder({
            xmldec: {
                standalone: false
            },
            doctype: {
                'pubID': '-//Recordare//DTD MusicXML 3.1 Partwise//EN',
                'sysID': 'http://www.musicxml.org/dtds/partwise.dtd'
            }
        });
        var finalPattern = builder.buildObject(finalPatternObj);

        timers.end("gen-musicxml");
        fs.writeFile(eopts._fullname_notempo + fileExt, finalPattern, function(error) {
            if (error) {
                Log.error(error);
                reject(error);
                return;
            }

            var audioCmd = "perl /opt/app/musicxml2mid.pl " + eopts._fullname_notempo + fileExt + " > " + eopts._fullname_notempo + ".midi ";
            var audiochild;
            audiochild = exec(audioCmd, function(error, stdout, stderr) {
                if (error) {
                    reject();
                    return;
                }
                resolve();
            });
        });
    });
};

var generatePNG = function(filename) {
    return new Promise(function(resolve, reject) {

        if (fs.existsSync(filename + ".png")) {
            resolve();
            return;
        }

        timers.start("gen-msxml-png");
        var genchild;
        //genchild = exec("cd " + dir_prefix + " && bash /opt/app/lilyclient.sh --png '" + filename + ".ly'", function(error, stdout, stderr) {
        var imageCmd = "echo 1";
        genchild = exec(imageCmd, function(error, stdout, stderr) {
            timers.end("gen-msxml-png");
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
        var audiochild;
        //var audioCmd = "perl /opt/app/musicxml2mid.pl " + filename + ".musicxml > " + filename + ".midi ";
        // audioCmd += "&& timidity --preserve-silence -EFreverb=0 -A120 -OwM1 " + filename + ".midi ";
        var audioCmd = "timidity --preserve-silence -EFreverb=0 -A120 -OwM1 " + filename + ".midi ";
        audioCmd += "&&  sox --combine mix /tmp/silence.wav " + filename + ".wav " + filename + ".ogg trim 0 " + endtime + " ";
        audiochild = exec(audioCmd, function(error, stdout, stderr) {
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
    });
};

var getMusicXML = function(pattern, eopts, cb) {
    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    generateMusicXml(pattern, eopts).then(function() {
        fs.readFile(eopts._fullname_notempo + ".musicxml", function(err, buf) {
            cb(err, buf);
        });
    }).catch(function(e) {
        cb(e);
    });
};

var generateAllFiles = function(pattern, eopts) {

    eopts = getDefaultOptions(eopts);
    eopts = generateFilename(pattern, eopts);
    var cacheName = "cache-gen-msxml-prom-" + eopts._hash;
    var cachedItem = cache.get(cacheName);

    if (cachedItem) {
        return cachedItem;
    }

    var prom = new Promise(function(resolve, reject) {
        generateMusicXml(pattern, eopts).then(function() {
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
    eopts._hash = fullBuffedOpts;

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

var testpat = [
    ["l", ['r', 'r'], "R", ['l', 'l', 'l', 'l', 'l']]
];

getMusicXML(testpat, {}, function(e, d) {
    if (e) {
        console.log(e);
    }
});


module.exports = {
    getImage: getImage,
    getAudio: getAudio,
    getRawFile: getMusicXML
};
