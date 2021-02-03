/* global require, describe, it */
/* jshint strict:false */

var main = require("../commonblockfuncs.js");
var assert = require('assert');

describe("Common Exported Tests", function() {

    it("Should import and export blocks nicely", function() {
        var blockset1 = ["l", "L", "r"];
        var outputBlocks = JSON.parse(main.importBlocks(main.exportBlocks(blockset1)));
        assert.deepEqual(blockset1, outputBlocks, "Input and output should match!");
    });

    it("Importing and exporting should handle bad data", function() {
        this.skip();
    });

    it("Regression check - ConvertNumSimple should work", function() {

        // default length
        assert.equal(main.convertNumSimple(101), main.convertNumSimple(101, 8));
        assert.equal(main.convertNumSimple(951), main.convertNumSimple(951, 8));
        assert.equal(main.convertNumSimple(123456789), main.convertNumSimple(123456789, 8));

        // positives
        assert.equal("sbbbbb6cb3e", main.convertNumSimple(101, 8));
        assert.equal("sb3e", main.convertNumSimple(101, 2));
        assert.equal("sb4cml", main.convertNumSimple(5010, 3));
        assert.equal("sbbbbbbbb3c6c5cb3c3cbml", main.convertNumSimple(150150, 16));
        assert.equal("sb4cb6cbb3cbb4c4c3c5c6c4c4e", main.convertNumSimple(123456789101112, 16));
        assert.equal("s5c4c4e", main.convertNumSimple(12345678910111213, 3));

        // negatives
        assert.notEqual("sbbbbb6cb3e", main.convertNumSimple(01, 9));
        assert.notEqual(main.convertNumSimple(101, 8), main.convertNumSimple(101, 9));
    });

    it("Regression check - getMappedTuple should work", function() {

        assert.deepEqual(main.getMappedTuple([], 2), ['-', 'R']);
        assert.deepEqual(main.getMappedTuple(['x'], 2), ['-', 'R']);
        assert.deepEqual(main.getMappedTuple([], 5), ['-', 'r', '-']);
        assert.deepEqual(main.getMappedTuple(11, 5, ['c', 'd']), ['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c', 'd', 'c', 'd']);
        assert.deepEqual(main.getMappedTuple(8, 1565, ['l', ':', '2', ',']), ['l', 'l', ':', '2', 'l', ':', ',', ':']);
        assert.deepEqual(main.getMappedTuple(3, 7895, ['R', 'l', 'x', 'X']), ['l', 'l', 'X']);

        assert.deepEqual(main.getMappedTuple(2, 0), ['-', '-']);
        assert.deepEqual(main.getMappedTuple(2, 1), ['-', 'r']);
        assert.deepEqual(main.getMappedTuple(2, 2), ['-', 'R']);
        assert.deepEqual(main.getMappedTuple(2, 3), ['-', 'l']);
        assert.deepEqual(main.getMappedTuple(2, 4), ['-', 'L']);

        assert.deepEqual(main.getMappedTuple(2, 5), ['r', '-']);
        assert.deepEqual(main.getMappedTuple(2, 6), ['r', 'r']);
        assert.deepEqual(main.getMappedTuple(2, 7), ['r', 'R']);
        assert.deepEqual(main.getMappedTuple(2, 8), ['r', 'l']);
        assert.deepEqual(main.getMappedTuple(2, 9), ['r', 'L']);

        assert.deepEqual(main.getMappedTuple(2, 10), ['R', '-']);
        assert.deepEqual(main.getMappedTuple(2, 11), ['R', 'r']);
        assert.deepEqual(main.getMappedTuple(2, 12), ['R', 'R']);
        assert.deepEqual(main.getMappedTuple(2, 13), ['R', 'l']);
        assert.deepEqual(main.getMappedTuple(2, 14), ['R', 'L']);

        assert.deepEqual(main.getMappedTuple(2, 15), ['l', '-']);
        assert.deepEqual(main.getMappedTuple(2, 16), ['l', 'r']);
        assert.deepEqual(main.getMappedTuple(2, 17), ['l', 'R']);
        assert.deepEqual(main.getMappedTuple(2, 18), ['l', 'l']);
        assert.deepEqual(main.getMappedTuple(2, 19), ['l', 'L']);

        assert.deepEqual(main.getMappedTuple(2, 20), ['L', '-']);
        assert.deepEqual(main.getMappedTuple(2, 21), ['L', 'r']);
        assert.deepEqual(main.getMappedTuple(2, 22), ['L', 'R']);
        assert.deepEqual(main.getMappedTuple(2, 23), ['L', 'l']);
        assert.deepEqual(main.getMappedTuple(2, 24), ['L', 'L']);
    });

});
