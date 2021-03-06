/* global require, describe, it */
/* jshint strict:false */

var main = require("../main.js");
var assert = require('assert');

describe("Main Lilypond Exported Tests", function() {

    it("Should have an image function", function() {
        assert.equal('function', typeof main.getImage);
    });

    it("Should have an audio function", function() {
        assert.equal('function', typeof main.getAudio);
    });

    it("Should have a rawfile function", function() {
        assert.equal('function', typeof main.getRawFile);
    });
});
