/* jshint strict:false */
/* global Buffer, module */

var util = require('./util.js');

var impExpMap = {
  '[[':'s',
  ']]':'S',
  '","':'d',
  '"]':'f',
  '["':'F'
};

var makeCleanBlock = function(blocks) {
    var pat = [];
    for (var b = 0; b < blocks; b++) {
        pat[b] = '|';
    }

    return pat;
};


var convertNumSimple = function(num, patlen, mappings) {

    mappings = (!mappings || mappings.length === 0) ? ['-', 'r', 'R', 'l', 'L'] : mappings;

    patlen = patlen || 8;

    var ret = exportBlocks([genericMapper(num, patlen, mappings)]);
    return ret;
};


var exportBlocks = function(blocks) {
    var enc = JSON.stringify(blocks);
    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(util.regexEscape(m), "g");
        enc = enc.replace(regex, impExpMap[m]);
    }
    enc = new Buffer(enc);
    enc = enc.toString('base64');
    return enc;
};

var importBlocks = function(patid) {
    var pat = new Buffer(patid, 'base64');
    pat = pat.toString('UTF-8');
    var regex;
    for (var m in impExpMap) {
        regex = new RegExp(util.regexEscape(impExpMap[m]), "g");
        pat = pat.replace(regex, m);
    }
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
    convertNumSimple: convertNumSimple,
    exportBlocks: exportBlocks,
    importBlocks: importBlocks,
    convertNumToTuple: convertNumToTuple,
    getMappedTuple: getMappedTuple,
    genericMapper: genericMapper,
    makeCleanBlock: makeCleanBlock
};
