/* global require, describe, it */
/* jshint strict:false */

var main = require("../commonblockfuncs.js");
var assert = require('assert');

describe("Common Exported Tests", function() {

    it("Should import and export blocks nicely", function() {
        var blockset1 = ["l", "L", "r"];
        var outputBlocks = main.importBlocks(main.exportBlocks(blockset1));
        assert.deepEqual(blockset1, outputBlocks, "Input and output should match!");
    });

    it("Importing and exporting should handle bad data", function() {
        this.skip();
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
