/* global module, require */
/* jshint strict: false */

var config = require('./config.js');

function sanitizeTuples(tupQ){
  tupQ = tupQ || "";
  var tup = tupQ.split(",");
  
  for (var t in tup) {
    try {
      tup[t] = parseInt(tup[t]);
      tup[t] = Math.abs(tup[t]) % 17;
    } catch (e) {
      return false;
    }
  }

  return tup;
}

module.exports = {
  tuples: sanitizeTuples
};
