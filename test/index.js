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

chai.use(chaiHttp);

describe("Server tests", function(){

  after(function(){
    indexjs.this_server.close();
  });

  it("Should have a working health endpoint", function(done){
     chai.request(server)
      .get('/health')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        done();
      }); 
  });

  it("Should have a working metrics endpoint", function(done){
     chai.request(server)
      .get('/metrics')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        done();
      }); 
  }); 

  it("Should have a working timer endpoint", function(done){
     chai.request(server)
      .get('/timers')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        done();
      }); 
  });

  it("Should have a working image route", function(done){
  this.timeout(5000);
  this.slow(3000);
     chai.request(server)
      .get('/public/image')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        done();
      }); 
  });

  it("Should have a working audio route", function(done){
  this.timeout(5000);
  this.slow(2000);
     chai.request(server)
      .get('/public/audio')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        done();
      }); 
  });

  it("Should have a pattern header present on image", function(done){
  this.timeout(5000);
  this.slow(3000);
     chai.request(server)
      .get('/public/image')
      .end(function (err, res) {
        assert(res.headers['x-drumgen-patref']);
        done();
      }); 
  });

  it("Should have a pattern header present on audio", function(done){
  this.timeout(5000);
  this.slow(3000);
     chai.request(server)
      .get('/public/audio')
      .end(function (err, res) {
        assert(res.headers['x-drumgen-patref']);
        done();
      }); 
  });

});
