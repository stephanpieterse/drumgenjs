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

describe("Media tests", function(){

  after(function(){
    indexjs.this_server.close();
  });

  it("Straight public/image should display and be what we expect", function(done){
  this.timeout(2000);
  this.slow(1000);
     chai.request(server)
      .get('/public/image')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        res.should.have.status(200);
        terminalImage.buffer(res.body).then(function(s){
        console.log(s);
        done();
        });
      }); 
  });

});
