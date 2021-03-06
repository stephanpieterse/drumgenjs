/* global require, describe, it, after */
/* jshint strict: false, esversion: 6 */

const chai = require('chai');
const chaiHttp = require('chai-http');

var config = require("../config.js");
config.server.port = 9991;
config.tmpdir = "/tmp/";
const indexjs = require('../index.js');
const server = indexjs.app;

// this is in fact used; even though the assignment isn't
const should = chai.should();
const expect = require('chai').expect;
const assert = require('assert');
var blockfuncs = require("../commonblockfuncs.js");

chai.use(chaiHttp);

describe("Server tests", function() {

    after(function() {
        indexjs.this_server.close();
    });

    it("Should have a working health endpoint", function(done) {
        chai.request(server)
            .get('/health')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working metrics endpoint", function(done) {
        chai.request(server)
            .get('/prometheus')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working timer endpoint", function(done) {
        chai.request(server)
            .get('/timers')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working image route", function(done) {
        this.timeout(2000);
        this.slow(1000);
        chai.request(server)
            .get('/public/image')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working audio route", function(done) {
        this.timeout(3000);
        this.slow(2000);
        chai.request(server)
            .get('/public/audio')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working audio route with metronome", function(done) {
        this.timeout(3000);
        this.slow(2000);
        chai.request(server)
            .get('/public/audio?seed=anuncachedone&nometro=false')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a working worksheet page", function(done) {
        this.timeout(3000);
        this.slow(2000);
        chai.request(server)
            .get('/worksheetfilter/2')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                done();
            });
    });

    it("Should have a pattern header present on image", function(done) {
        this.timeout(2000);
        this.slow(1000);
        chai.request(server)
            .get('/public/image')
            .end(function(err, res) {
                assert(res.headers['x-drumgen-patref']);
                done();
            });
    });

    it("Should have a pattern header present on audio", function(done) {
        this.timeout(5000);
        this.slow(3000);
        chai.request(server)
            .get('/public/audio')
            .end(function(err, res) {
                assert(res.headers['x-drumgen-patref']);
                done();
            });
    });

    it("Should return the same patref when getting a pattern with a patref", function(done) {
        chai.request(server)
            .get('/public/pattern')
            .end(function(err, res) {
                chai.request(server)
                    .get('/public/pattern?patref=' + res.body.patref)
                    .end(function(err, resnext) {
                        assert.deepEqual(resnext.body, res.body);
                        done();

                    });
            });
    });

    it("Should return the sticking inverted pattern when called with patref", function(done) {
        var pattern = blockfuncs.exportBlocks(['i', 'l', 'R', 'U', 'Y']);
        chai.request(server)
            .get('/public/custom/invert/patref/' + pattern)
            .end(function(err, res) {
                assert.deepEqual(['u', 'r', 'L', 'I', 'y'], res.body.inverted);
                done();
            });
    });

});
