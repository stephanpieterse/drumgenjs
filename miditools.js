/* jshint strict: false */
/* global require , Buffer , module */

var Log = require('./logger.js');

var fs = require('fs');
var parseMidi = require('midi-file').parseMidi;
var writeMidi = require('midi-file').writeMidi;

// It may seem silly to have all three below
// functions, but they exist for clarity
// in code what you are trying to do, not
// what you are actually doing.
function msBpmSwap(one) {
    return parseInt(60000 / one * 1000);
}

function microsecondsToBpm(ms) {
    return msBpmSwap(ms);
}

function bpmToMicroseconds(bpm) {
    return msBpmSwap(bpm);
}

function changeMidiTempo(newtempo, infile, outfile) {
    try {
        Log.debug("Changing tempo for " + infile + " and putting it to " + outfile);
        var input = fs.readFileSync(infile);
        var parsed = parseMidi(input);

        for (var o in parsed.tracks[0]) {
            if (parsed.tracks[0][o].type === "setTempo") {
                Log.debug("Current tempo is :: " + microsecondsToBpm(parsed.tracks[0][o].microsecondsPerBeat));
                parsed.tracks[0][o].microsecondsPerBeat = bpmToMicroseconds(newtempo);
                Log.debug("Tempo changed to :: " + microsecondsToBpm(parsed.tracks[0][o].microsecondsPerBeat));
                break;
            }
        }

        var output = writeMidi(parsed);
        var outputBuffer = new Buffer.from(output);

        fs.writeFileSync(outfile, outputBuffer);
        return true;
    } catch (e) {
        Log.error(e);
        return false;
    }
}

module.exports = {
    changeMidiTempo: changeMidiTempo
};
