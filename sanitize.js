/* global module, require */
/* jshint strict: false */

var config = require('./config.js');
var MAX_STRING_LENGTH = 248; // Filename length comes into play here as that is how we cache items
var MAX_TUPLE_DIV = 17;

function sanitizeTuples(tupQ) {
    tupQ = tupQ || "";
    var tup = tupQ.split(",");

    for (var t in tup) {
        try {
            tup[t] = (isNaN(tup[t]) || tup[t] === "") ? 1 : parseInt(tup[t]);
            tup[t] = Math.abs(tup[t]) % MAX_TUPLE_DIV;
        } catch (e) {
            return false;
        }
    }

    return tup;
}

function trimString(tstring) {

    if (!tstring) {
        return tstring;
    }

    tstring = tstring.substring(0, MAX_STRING_LENGTH);
    tstring = tstring.trim();

    return tstring;

}

function cleanString(tstring, remRegex) {
    return tstring.replace(remRegex, '');
}

function cleanNonAlphaNum(tstring) {
    return cleanString(tstring, /[^a-z0-9 ]/gi);
}

function soundMap(darr){
  var safeValues = ["sn","bd","hh","ss","wbl","boh"];
  darr = darr.slice(0, 4);
  darr = darr.map(function(i){
    if (safeValues.indexOf(i) >= 0){
      return i;
    } else {
      return 'sn';
    }
  });
  return darr;
}

module.exports = {
    tuples: sanitizeTuples,
    trimString: trimString,
    cleanString: cleanString,
    cleanNonAlphaNum: cleanNonAlphaNum,
    soundMap: soundMap
};
