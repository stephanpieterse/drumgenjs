/* global require, describe, it, after */
/* jshint strict: false, esversion: 6 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const terminalImage = require('terminal-image');
const fs = require('fs');

var configpath = "../config.js";
delete require.cache[require.resolve(configpath)];
var config = require(configpath);
config.server.port = 9993;
config.tmpdir = "/tmp/";
var indexpath = "../index.js";
delete require.cache[require.resolve(indexpath)];
var indexjs = require(indexpath);
const server = indexjs.app;

var execSync = require('child_process').execSync;
// this is in fact used; even though the assignment isn't
const should = chai.should();
const expect = require('chai').expect;
const assert = require('assert');

chai.use(chaiHttp);

const binaryParser = function(res, cb) {
    res.setEncoding("binary");
    res.data = "";
    res.on("data", function(chunk) {
        res.data += chunk;
    });
    res.on("end", function() {
        //cb(null, new Buffer(res.data, "binary"));
        cb(null, Buffer.from(res.data, "binary"));
    });
};

describe("Audio spectrogram tests", function() {

    after(function() {
        indexjs.this_server.close();
    });

    it("Sound should contain flams", function(done) {
        this.timeout(5000);
        this.slow(3000);
        var imgid = 'cyJSZHVkSWRJIlM=';
        chai.request(server)
            .get('/public/refresh/audio')
            .query('?nometro=true&patref=' + imgid)
            .buffer()
            .parse(binaryParser)
            .end(function(err, res) {
                assert.equal(res.status, 200);
                fs.writeFileSync('/tmp/f1.ogg', res.body);
                execSync("sox /tmp/f1.ogg -n spectrogram -l -x 4096 -o /tmp/spec.png", {
                    timeout: 3000
                });

                terminalImage.buffer(fs.readFileSync('/tmp/spec.png')).then(function(s) {
                    console.log(s);
                    done();
                });
                
            });
    });
});
