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

    it("Should generate different data for different secrets that might be close together", function() {
        var otps = [];
        for (var s = 10; s < 200; s += 1) {
            var gotps = util.getOTP(s);
            //assert.notEqual(util.getOTP(s), util.getOTP(s+1));
            assert.equal(-1, otps.indexOf(gotps), 'There is an OTP duplication in a small range');
            otps.push(gotps);
        }
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

describe('Misc Util', function() {
    it("Regression check - lpad should work", function() {

        // positives
        assert.equal(util.lpad(5, 2), "05", "Padding doesn't work!");
        assert.equal(util.lpad("19", 5), "00019", "Padding doesn't work!");
        assert.equal(util.lpad(5000, 5), "05000", "Padding doesn't work!");

        // negatives
        assert.notEqual(util.lpad("19", 4), "00019", "Padding doesn't work!");
        assert.notEqual(util.lpad(500, 10), "009", "Padding doesn't work!");

    });

    describe('Util tests - stats', function() {
        it("Should report accurate stats", function() {
            var statpat;
            var retstat;
            statpat = ['L', 'l'];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 2);
            assert.equal(retstat.Rmappings, 0);
            assert.equal(retstat.totalNotes, 2);
            assert.equal(retstat.totalAccents, 1);
            assert.equal(retstat.longestConsecutiveL, 2);

            statpat = ['L', '-'];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 1);
            assert.equal(retstat.Rmappings, 0);
            assert.equal(retstat.totalNotes, 1);
            assert.equal(retstat.totalAccents, 1);
            assert.equal(retstat.longestConsecutiveL, 1);
            assert.equal(retstat.startsWith, 'L');
            assert.equal(retstat.endsWith, '-');

            statpat = ['R', 'l', ['i', 'Y']];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 1);
            assert.equal(retstat.Rmappings, 3);
            assert.equal(retstat.totalNotes, 4);
            assert.equal(retstat.totalAccents, 1);
            assert.equal(retstat.deepestTuples, 1);
            assert.equal(retstat.totalTuples, 1);
            assert.deepEqual(retstat.contains, ['R','l','i','Y']);

            statpat = [
                ['r', 'r'], 'R', ['i', 'Y']
            ];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 0);
            assert.equal(retstat.Rmappings, 5);
            assert.equal(retstat.totalNotes, 5);
            assert.equal(retstat.totalAccents, 1);
            assert.equal(retstat.deepestTuples, 1);
            assert.equal(retstat.totalTuples, 2);
            assert.equal(retstat.longestConsecutiveR, 5);
            assert.equal(retstat.longestConsecutiveRepeat, 2);

            statpat = [
                ['r', 'r'], 'R', ['i', 'Y'],
                [
                    ['Y', ['Y'], 'r', 'L']
                ]
            ];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 1);
            assert.equal(retstat.Rmappings, 8);
            assert.equal(retstat.totalNotes, 9);
            assert.equal(retstat.totalAccents, 2);
            assert.equal(retstat.deepestTuples, 3);
            assert.equal(retstat.totalTuples, 5);
            assert.equal(retstat.longestConsecutiveR, 8);
            assert.equal(retstat.longestConsecutiveL, 1);
            assert.equal(retstat.longestConsecutiveRepeat, 3);
            assert.equal(retstat.startsWith, 'r');
            assert.equal(retstat.endsWith, 'L');

            statpat = [
                ['r', 'r'], 'R', ['U', 'Y'],
                [
                    ['Y', ['Y'], 'r', 'L']
                ], 'l', '-'
            ];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 3);
            assert.equal(retstat.Rmappings, 7);
            assert.equal(retstat.totalNotes, 10);
            assert.equal(retstat.totalAccents, 3);
            assert.equal(retstat.deepestTuples, 3);
            assert.equal(retstat.totalTuples, 5);
            assert.equal(retstat.longestConsecutiveR, 4);
            assert.equal(retstat.longestConsecutiveL, 2);
            assert.equal(retstat.longestConsecutiveRepeat, 3);
            assert.equal(retstat.totalRests, 1);
            assert.equal(retstat.startsWith, 'r');
            assert.equal(retstat.endsWith, '-');

            statpat = [
                ['-', '-'], 'l', '-'
            ];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.Lmappings, 1);
            assert.equal(retstat.Rmappings, 0);
            assert.equal(retstat.totalNotes, 1);
            assert.equal(retstat.totalAccents, 0);
            assert.equal(retstat.deepestTuples, 1);
            assert.equal(retstat.totalTuples, 1);
            assert.equal(retstat.longestConsecutiveR, 0);
            assert.equal(retstat.longestConsecutiveL, 1);
            assert.equal(retstat.longestConsecutiveRepeat, 2);
            assert.equal(retstat.totalRests, 3);
            assert.deepEqual(retstat.contains, ['-','l']);

            statpat = ['x','X','-','x'];
            retstat = util.patternStats(statpat);
            assert.equal(retstat.longestConsecutiveRepeat, 1);
            assert.equal(retstat.longestConsecutiveBlank, 2);
            assert.deepEqual(retstat.contains, ['x','X','-']);
        });
    });
});
