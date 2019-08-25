/* global require, describe, it, after */
/* jslint strict:false */
var loadtest = require('loadtest');

var configpath = "../config.js";
delete require.cache[require.resolve(configpath)];
var config = require(configpath);
config.server.port = 9992;
var indexpath = "../index.js";
delete require.cache[require.resolve(indexpath)];
var indexjs = require(indexpath);

var url = require('url');

function randomString() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 7);
}

function perfReporter(data) {
    var noRequestPerHour = data.noRequestPerHour;
    var gLatency = data.gLatency;
    var avgRequestTime = data.avgRequestTime;

    console.info("\n==============================\n");
    console.info("Requests per hour: " + noRequestPerHour);
    console.info("Avg request time(Millis): " + avgRequestTime);
    console.info("\n==============================\n");
    console.info("Total Requests :", gLatency.totalRequests);
    console.info("Total Failures :", gLatency.totalErrors);
    console.info("Requests/Second :", gLatency.rps);
    console.info("Requests/Hour :", (gLatency.rps * 3600));
    console.info("Avg Request Time:", gLatency.meanLatencyMs);
    console.info("Min Request Time:", gLatency.minLatencyMs);
    console.info("Max Request Time:", gLatency.maxLatencyMs);
    console.info("Percentiles :", gLatency.percentiles);
    console.info("\n===============================\n");

}

describe("Performance Test", function() {
    after(function() {
        indexjs.this_server.close();
    });
    it("performance testing /health", function(done) {
        var noRequestPerHour = 5000;
        var avgRequestTime = 50;

        this.timeout(1000 * 60);
        this.slow(1000 * 60);

        var options = {
            "url": 'http://localhost:' + config.server.port + '/health',
            "maxSeconds": 5,
            "concurrency": 7,
            "statusCallback": statusCallback
        };

        var gLatency;

        function statusCallback(error, result, latency) {
            gLatency = latency;
        }

        var operation = loadtest.loadTest(options, function(error) {
            if (error) {
                console.error('Got an error: %s', error);
            } else if (operation.running === false) {
                var data = {};
                data.gLatency = gLatency;
                data.noRequestPerHour = noRequestPerHour;
                data.avgRequestTime = avgRequestTime;
                perfReporter(data);

                gLatency.totalErrors.should.equal(0);
                (gLatency.rps * 3600).should.be.greaterThan(noRequestPerHour);
                (gLatency.meanLatencyMs).should.be.below(avgRequestTime);

                done();
            }
        });
    });

    it("performance testing /public/image cached", function(done) {

        var noRequestPerHour = 500;
        var avgRequestTime = 50;

        this.timeout(1000 * 60);
        this.slow(1000 * 60);

        var options = {
            "url": 'http://localhost:' + config.server.port + '/public/image',
            "maxSeconds": 15,
            "concurrency": 9,
            "statusCallback": statusCallback
        };

        var gLatency;

        function statusCallback(error, result, latency) {
            gLatency = latency;
        }

        var operation = loadtest.loadTest(options, function(error) {
            if (error) {
                console.error('Got an error: %s', error);
            } else if (operation.running === false) {
                var data = {};
                data.gLatency = gLatency;
                data.noRequestPerHour = noRequestPerHour;
                data.avgRequestTime = avgRequestTime;
                perfReporter(data);

                gLatency.totalErrors.should.equal(0);
                (gLatency.rps * 3600).should.be.greaterThan(noRequestPerHour);
                (gLatency.meanLatencyMs).should.be.below(avgRequestTime);

                done();
            }
        });
    });

    it("performance testing /public/image uniques", function(done) {

        var noRequestPerHour = 3000;
        var avgRequestTime = 5000;

        var basePath = 'http://localhost:' + config.server.port + '/public/image';

        var uniqSeedRequestGenerator = function(params, options, client, callback) {
            var newOpts = url.parse(basePath + "?seed=" + randomString());
            return client(newOpts, callback);
        };

        this.timeout(1000 * 60 * 2);
        this.slow(1000 * 60 * 2);

        var options = {
            "url": basePath,
            "maxSeconds": 60,
            "concurrency": 5,
            "statusCallback": statusCallback,
            "requestGenerator": uniqSeedRequestGenerator
        };

        var gLatency;

        function statusCallback(error, result, latency) {
            gLatency = latency;
        }

        var operation = loadtest.loadTest(options, function(error) {
            if (error) {
                console.error('Got an error: %s', error);
            } else if (operation.running === false) {
                var data = {};
                data.gLatency = gLatency;
                data.noRequestPerHour = noRequestPerHour;
                data.avgRequestTime = avgRequestTime;
                perfReporter(data);
                gLatency.totalErrors.should.equal(0);
                (gLatency.rps * 3600).should.be.greaterThan(noRequestPerHour);
                (gLatency.meanLatencyMs).should.be.below(avgRequestTime);

                done();
            }
        });
    });

});
