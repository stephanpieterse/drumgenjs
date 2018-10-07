/* jshint strict:false */
/* global require, module */

var crypto = require("crypto");
var Log = require("./logger.js");
var NodeCache = require('node-cache');
var cache = new NodeCache({stdTTL:120, checkperiod: 10});


var TOTP = function() {

    var dec2hex = function(s) {
        return (s < 15.5 ? "0" : "") + Math.round(s).toString(16);
    };

    var hex2dec = function(s) {
        return parseInt(s, 16);
    };

    var leftpad = function(s, l, p) {
        if(l + 1 >= s.length) {
            s = Array(l + 1 - s.length).join(p) + s;
        }
        return s;
    };

    var base32tohex = function(base32) {
        var base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var bits = "";
        var hex = "";
        var i;
        for(i = 0; i < base32.length; i++) {
            var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
            bits += leftpad(val.toString(2), 5, '0');
        }
        for(i = 0; i + 4 <= bits.length; i+=4) {
            var chunk = bits.substr(i, 4);
            hex = hex + parseInt(chunk, 2).toString(16) ;
        }
        return hex;
    };

    this.getOTP = function(secret) {

        if (cache.get(secret)){
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

module.exports = {

	getOTP: totpObj.getOTP,
  cache: cache,

};
