/* jshint strict:false */
/* global require, module */

var crypto = require("crypto");
var Log = require("./logger.js");
var NodeCache = require('node-cache');
var cache = new NodeCache({
    stdTTL: 120,
    checkperiod: 10
});


var TOTP = function() {

    var dec2hex = function(s) {
        return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
    };

    var hex2dec = function(s) {
        return parseInt(s, 16);
    };

    var leftpad = function(s, l, p) {
        if (l + 1 >= s.length) {
            s = Array(l + 1 - s.length).join(p) + s;
        }
        return s;
    };

    var base32tohex = function(base32) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
        var i;
        for (i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += leftpad(val.toString(2), 5, '0');
        }
        for (i = 0; i + 4 <= bits.length; i += 4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16);
        }
        return hex;
    };

    this.getOTP = function(seed) {
        seed = "" + seed;
        var secret = crypto.createHash('sha256').update(seed).digest('base64');
        if (cache.get(secret)) {
            return cache.get(secret);
        }

        try {

            var epoch = Math.round(new Date().getTime() / 1000.0);
            var validSecs = 60 * 30; // seconds * minutes

            // why?
            // so that there is not a new secret for all every 30min
            // that'll skyrocket the load. spread it over some time.
            var secOffset = parseInt(secret.substr(-7), 36) % validSecs;
            epoch = epoch + secOffset;

            var time = leftpad(dec2hex(Math.floor(epoch / validSecs)), 16, "0");

            var hmacsha1 = crypto.createHmac('sha1', base32tohex(secret));
            var htime = time.toString("hex");
            Log.debug(htime);

            hmacsha1.update(htime);
            var hmac = hmacsha1.digest().toString('hex');
            Log.debug(hmac);

            var offset = hex2dec(hmac.substring(hmac.length - 1));
            Log.debug(offset);

            var otp = (hex2dec(hmac.substr(offset * 2, 8)) & hex2dec("7fffffff")) + "";
            var olen = 8;
            otp = (otp).substr(otp.length - olen, olen);

        } catch (error) {
            Log.error(error);
            return 0;
        }

        cache.set(secret, otp, 15);
        return otp;
    };

};

var totpObj = new TOTP();

var lpad = function(value, padding) {
    var zeroes = "0";

    for (var i = 0; i < padding; i++) {
        zeroes += "0";
    }

    return (zeroes + value).slice(padding * -1);
};


function regexEscape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function patternStats(blocks) {

    var stats = {
        Lmappings: 0,
        Rmappings: 0,
        totalAccents: 0,
        totalNotes: 0,
        totalRests: 0,
        totalTuples: 0,
        deepestTuples: 0,
        counts: {},
        longestConsecutiveL: 0,
        longestConsecutiveR: 0,
        longestConsecutiveRepeat: 0,
        longestConsecutiveBlank: 0,
        contains: [],
        startsWith: '',
        endsWith: ''
    };

    function nestedStats(blocks, stats, runstat) {

        for (var b = 0; b < blocks.length; b++) {
            if (Array.isArray(blocks[b])) {
                runstat.curLevel += 1;
                stats.totalTuples += 1;
                stats = nestedStats(blocks[b], stats, runstat);
                runstat.curLevel -= 1;
            } else {
                stats = singleStats(blocks[b], stats, runstat);
                if (blocks[b] !== runstat.prevNote) {
                    runstat.curNoteStreak = 1;
                } else {
                    runstat.curNoteStreak += 1;
                }
                stats.longestConsecutiveRepeat = Math.max(stats.longestConsecutiveRepeat, runstat.curNoteStreak);
                runstat.prevNote = blocks[b];
            }
        }

        stats.deepestTuples = Math.max(stats.deepestTuples, runstat.curLevel);
        return stats;

    }

    function singleStats(blockb, stats, runstat) {
        if (stats.contains.indexOf(blockb) === -1){
          stats.contains.push(blockb);
        }
        if (stats.startsWith === ''){
          stats.startsWith = blockb;
        }
        stats.endsWith = blockb;

        var Lmappings = ['y', 'o', 'U', 'u', 'L', 'l'];
        var Rmappings = ['Y', 'O', 'I', 'i', 'r', 'R'];
        var AccentMappings = ['I', 'U', 'L', 'R', 'X'];
        var blankMappings = ['x', 'X'];
        var curLimb = '-';

        stats.counts[blockb] = (stats.counts[blockb] || 0) + 1;
        if (blockb === '-') {
            stats.totalRests += 1;
        } else {
            stats.totalNotes += 1;
        }
        if (Lmappings.includes(blockb)) {
            stats.Lmappings += 1;
            curLimb = 'l';
        }
        if (Rmappings.includes(blockb)) {
            stats.Rmappings += 1;
            curLimb = 'r';
        }
        if (blankMappings.includes(blockb)) {
            curLimb = 'x';
        }
        if (AccentMappings.includes(blockb)) {
            stats.totalAccents += 1;
        }

        if (curLimb === runstat.prevLimb) {
            runstat.curLimbStreak += 1;
        } else {
            runstat.prevLimb = curLimb;
            runstat.curLimbStreak = 1;
        }
        switch (curLimb) {
            case 'r':
                stats.longestConsecutiveR = Math.max(stats.longestConsecutiveR, runstat.curLimbStreak);
                break;
            case 'l':
                stats.longestConsecutiveL = Math.max(stats.longestConsecutiveL, runstat.curLimbStreak);
                break;
            case 'x':
                stats.longestConsecutiveBlank = Math.max(stats.longestConsecutiveBlank, runstat.curLimbStreak);
                break;
        }

        return stats;
    }

    stats = nestedStats(blocks, stats, {
        curLevel: 0,
        prevNote: '',
        curNoteStreak: 1,
        prevLimb: '',
        curLimbStreak: 1
    });

    return stats;

}

module.exports = {

    getOTP: totpObj.getOTP,
    cache: cache,
    lpad: lpad,
    regexEscape: regexEscape,
    patternStats: patternStats

};
