/* global require, describe, it */
/* jshint strict:false */

var config = require("../config.js");
config.server.port = 9991;
config.tmpdir = "/tmp/";
config.tmpCleanupInterval = 2000;
config.tmpMaxAge = 60;
var cleanup = require("../cleanup.js");
var fs = require('fs');
var assert = require('assert');

describe("Cleanup Tests - Module", function() {

    var nl = "\n";
    var runCounter = 0;

    it("Start should create a timer and execute", function(done) {
        this.slow(5000);
        this.timeout(6000);

        var cbfunc = function() {
            runCounter += 1;
            done();
        };
        cleanup.start(cbfunc);
    });

    it("Should not call the interval function again after being cleared", function(done) {
        this.timeout(6000);
        this.slow(4000);
        cleanup.stop();
        setTimeout(function() {
            assert.equal(1, runCounter);
            done();
        }, config.tmpCleanupInterval * 2);
    });

    it("Should delete files with marks that are older than specified", function(done) {
        this.timeout(10000);
        this.slow(5000);
        var filedata = "";
        filedata += "#lilyversion" + nl;
        filedata += "% a random comment" + nl;
        filedata += "% gendate:" + parseInt(Date.now() / 1000 - (config.tmpMaxAge * 4)) + nl;

        var testfilename = config.tmpdir + "testfileexists";
        var filenamesToCheck = [testfilename + ".ly", testfilename + ".png", testfilename + ".testme"];
        for (var ftc in filenamesToCheck) {
            fs.writeFileSync(filenamesToCheck[ftc], filedata);
        }
        cleanup.start(function() {
            // deletion happens async so we need to wait a bit just in case
            setTimeout(function() {
                for (var ftc in filenamesToCheck) {
                    try {
                        fs.statSync(filenamesToCheck[ftc]);
                    } catch (e) {
                        console.log(e);
                        if (e && e.code === 'ENOENT') {
                            assert(true, true);
                        } else {
                            assert(false, true, 'It seems the file did exist');
                        }
                    }
                }
                cleanup.stop();
                done();
            }, 1000);
        });

    });

    it("Should not delete files with marks that are younger than specified", function(done) {
        this.timeout(10000);
        this.slow(5000);
        var filedata = "";
        filedata += "#lilyversion" + nl;
        filedata += "% a random comment" + nl;
        filedata += "% gendate:" + parseInt(Date.now() / 1000) + nl;

        var testfilename = config.tmpdir + "testfileexists.ly";
        fs.writeFileSync(testfilename, filedata);
        cleanup.start(function() {
            // deletion happens async so we need to wait a bit just in case
            setTimeout(function() {
                fs.stat(testfilename, function(err, stats) {
                    if (err && err.code === 'ENOENT') {
                        assert(false, true);
                    } else {
                        assert(true, stats.isFile());
                    }
                    cleanup.stop();
                    done();
                });
            }, 1000);
        });
    });
});
