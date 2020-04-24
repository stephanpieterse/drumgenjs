/* global require, describe, it */
/* jshint strict:false */
var util = require("../util.js");
var assert = require('assert');

describe("Util tests - OTP", function() {

    it("Should export an otp function", function() {
        if (util.getOTP) {
            assert(true, true);
        } else {
            assert(true, false, "No OTP function was found!");
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
            assert(true, false, "Did not export a cache!");
        }
    });

    it("Should set and get something in cache", function() {
        var cval = "Testing 1 2";
        util.cache.set("test", cval);
        assert.equal(util.cache.get("test"), cval);
    });

});

describe('Misc Util', function(){
    it("Regression check - lpad should work", function() {

        // positives
        assert.equal(util.lpad(5, 2), "05", "Padding doesn't work!");
        assert.equal(util.lpad("19", 5), "00019", "Padding doesn't work!");
        assert.equal(util.lpad(5000, 5), "05000", "Padding doesn't work!");

        // negatives
        assert.notEqual(util.lpad("19", 4), "00019", "Padding doesn't work!");
        assert.notEqual(util.lpad(500, 10), "009", "Padding doesn't work!");

    });
});
