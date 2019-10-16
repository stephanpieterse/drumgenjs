/* global module, require */
/* jshint strict: false */

var config = require('./config.js');
var MAX_STRING_LENGTH = 150;
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

function cleanNonAlphaNum(tstring){
	return cleanString(tstring, /[^a-z0-9 ]/gi);
}

module.exports = {
    tuples: sanitizeTuples,
    trimString: trimString,
		cleanString: cleanString,
		cleanNonAlphaNum: cleanNonAlphaNum
};
