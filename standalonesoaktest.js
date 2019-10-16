/* global require, describe, it */
/* jslint strict:false */
var loadtest = require('loadtest');
var url = require('url');


var chai = require('chai');
var should = chai.should();

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

       it("soak testing /public/audio tempo change", function(done) {

        var noRequestPerHour = 3000;
        var avgRequestTime = 1000;

        var basePath = 'http://drumgen.docker:5061/public/audio';

        var randTempo = function() {
            var min = 23;
            var max = 230;
            return Math.floor(Math.random() * (max - min)) + min;
        };

        var uniqSeedRequestGenerator = function(params, options, client, callback) {
            var newOpts = url.parse(basePath + "?seed=" + randomString() + "&tempo=" + randTempo());
            return client(newOpts, callback);
        };

				var testseconds = 300;
        this.timeout(1000 * 60 * testseconds * 2);
        this.slow(1000 * 60 * testseconds * 2);

        var options = {
            "url": basePath,
            "maxSeconds": 300,
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
