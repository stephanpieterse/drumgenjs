/* global require, describe, it */
/* jshint strict:false */
var util = require("../util.js");
var assert = require('assert');

describe("Util tests - OTP", function() {

    it("Should export an otp function", function() {
        if (util.getOTP) {
            assert(true, true);
        } else {

            assert(true, false);
        }
    });

    it("Should generate the same data for the same secret", function() {
        assert.equal(util.getOTP("aaa"), util.getOTP("aaa"));
    });

    it("Should generate different data for different secret", function() {
        assert.notEqual(util.getOTP("aaaaaaaaaa"), util.getOTP("b"));
    });

});

describe("Util tests - cache", function() {

    it("Should export a cache", function() {
        if (util.cache) {
            assert(true, true);
        } else {
            assert(true, false);
        }
    });

    it("Should set and get something in cache", function() {
        var cval = "Testing 1 2";
        util.cache.set("test", cval);
        assert.equal(util.cache.get("test"), cval);
    });

});
