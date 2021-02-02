/* jshint strict:false */
/* global Buffer, module */

var Log = require('./logger.js');
var util = require('./util.js');

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

var makeCleanBlock = function(blocks) {
    var pat = [];
    for (var b = 0; b < blocks; b++) {
        pat[b] = '|';
    }

    return pat;
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

var convertNumSimple = function(num, patlen, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['-', 'r', 'R', 'l', 'L'] : mappings;

    patlen = patlen || 8;

    var ret = exportBlocks([genericMapper(num, patlen, mappings)]);
    return ret;
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
        cpat = util.lpad(cpat, barlen);
        pattern[j] = cpat.split("");
        for (var px in pattern[j]) {
            pattern[j][px] = mappings[pattern[j][px]];
        }
        sipattern[j] = pattern[j];
    }

    var ret = exportBlocks(sipattern);
    return ret;
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
    enc = enc.replace(/"u"/g, 7);
    enc = enc.replace(/"U"/g, 8);
    enc = enc.replace(/"i"/g, 'i');
    enc = enc.replace(/"I"/g, 'I');
    enc = enc.replace(/"o"/g, 'o');
    enc = enc.replace(/"O"/g, 'O');
    enc = enc.replace(/"y"/g, 'y');
    enc = enc.replace(/"Y"/g, 'Y');
    enc = enc.replace(/"g"/g, 'g');
    enc = enc.replace(/"G"/g, 'G');

    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(util.regexEscape(m), "g");
        enc = enc.replace(regex, impExpMap[m]);
    }

    enc = new Buffer(enc);
    enc = enc.toString();
    return enc;
};

var importBlocks = function(patid) {

    var pat = new Buffer(patid);
    pat = pat.toString('UTF-8');

    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(util.regexEscape(impExpMap[m]), "g");
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
    pat = pat.replace(/7/g, '"u"');
    pat = pat.replace(/8/g, '"U"');
    pat = pat.replace(/i/g, '"i"');
    pat = pat.replace(/I/g, '"I"');
    pat = pat.replace(/o/g, '"o"');
    pat = pat.replace(/O/g, '"O"');
    pat = pat.replace(/y/g, '"y"');
    pat = pat.replace(/Y/g, '"Y"');
    pat = pat.replace(/g/g, '"g"');
    pat = pat.replace(/G/g, '"G"');

    Log.trace(pat);
    return pat;
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

var genericMapper = function(num, patlen, mappings) {

    var pattern = [];
    var sipattern = [];
    pattern[0] = makeCleanBlock(patlen);
    sipattern[0] = makeCleanBlock(patlen);

    var barlen = patlen;
    var notetypes = mappings.length;

    var randPat = parseInt(num);
    var cpat = (randPat).toString(notetypes);
    cpat = util.lpad(cpat, barlen);
    pattern[0] = cpat.split("");
    for (var px in pattern[0]) {
        // pattern[0][px] = mappings[pattern[0][px]];
        //pattern[0][px] = mappings[(pattern[0][px]).toString(10)];
        pattern[0][px] = mappings[parseInt(pattern[0][px], notetypes)];
    }

    sipattern[0] = pattern[0];

    return sipattern[0];
};


module.exports = {
    convertNum: convertNum,
    convertNumSimple: convertNumSimple,
    convertMulti: convertMulti,
    exportBlocks: exportBlocks,
    importBlocks: importBlocks,
    convertNumToTuple: convertNumToTuple,
    getMappedTuple: getMappedTuple,
    genericMapper: genericMapper,
    makeCleanBlock: makeCleanBlock
};
