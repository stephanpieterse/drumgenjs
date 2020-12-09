/* global require, describe, it, after */
/* jshint strict: false, esversion: 6 */

const chai = require('chai');
const chaiHttp = require('chai-http');
const terminalImage = require('terminal-image');

var config = require("../config.js");
config.server.port = 9991;
config.tmpdir = "/tmp/";
const indexjs = require('../index.js');
const server = indexjs.app;

// this is in fact used; even though the assignment isn't
const should = chai.should();
const expect = require('chai').expect;
const assert = require('assert');

chai.use(chaiHttp);

describe("Media tests", function() {

    after(function() {
        indexjs.this_server.close();
    });

    it("Straight public/image should be a valid image", function(done) {
        this.timeout(3000);
        this.slow(1000);
        chai.request(server)
            .get('/public/image')
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                terminalImage.buffer(res.body).then(function(s) {
                    console.log(s);
                    done();
                });
            });
    });

    it("Image should contain flams", function(done) {
        this.timeout(3000);
        this.slow(1000);
        var imgid = 's5c6c7c8e';
        chai.request(server)
            .get('/public/image/ref/' + imgid)
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                assert.equal(res.headers['x-drumgen-patref'], imgid);
                terminalImage.buffer(res.body).then(function(s) {
                    console.log(s);
                    done();
                });
            });
    });

    it("Image should contain tremolos", function(done) {
        this.timeout(5000);
        this.slow(2000);
        var imgid = 'socOc7c8e';
        chai.request(server)
            .get('/public/image/ref/' + imgid)
            .end(function(err, res) {
                expect(res).to.have.property('status');
                res.should.have.status(200);
                assert.equal(res.headers['x-drumgen-patref'], imgid);
                terminalImage.buffer(res.body).then(function(s) {
                    console.log(s);
                    done();
                });
            });
    });

  //  it("Image should contain flammed tremolos", function(done) {
  //      this.timeout(3000);
  //      this.slow(1000);
  //      var imgid = 'sycYc7c8e';
  //      chai.request(server)
  //          .get('/public/image/ref/' + imgid)
  //          .end(function(err, res) {
  //              expect(res).to.have.property('status');
  //              res.should.have.status(200);
  //              assert.equal(res.headers['x-drumgen-patref'], imgid);
  //              terminalImage.buffer(res.body).then(function(s) {
  //                  console.log(s);
  //                  done();
  //              });
  //          });
  //  });
});
