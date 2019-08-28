var fs = require('fs');
var parseMidi = require('midi-file').parseMidi;
var writeMidi = require('midi-file').writeMidi;

var input = fs.readFileSync('tmpgen/testfilein.midi');
var parsed = parseMidi(input);

console.log(JSON.stringify(parsed));

function microsecondsToBpm(ms){
	return parseInt(60000 / ms * 1000);
}

function bpmToMicroseconds(bpm){
	return parseInt(60000 / bpm * 1000);
}

for ( var o in parsed.tracks[0] ){
	if (parsed.tracks[0][o].type == "setTempo"){
		console.log("current tempo is :: " + microsecondsToBpm(parsed.tracks[0][o].microsecondsPerBeat));
		console.log("setting tempo 5 higher");
		var tmpo = microsecondsToBpm(parsed.tracks[0][o].microsecondsPerBeat);
		parsed.tracks[0][o].microsecondsPerBeat = bpmToMicroseconds(tmpo + 5);
	}
}

// edit spmething here

var output = writeMidi(parsed);
var outputBuffer = new Buffer(output);

fs.writeFileSync('tmpgen/testfilein.midi', outputBuffer);
