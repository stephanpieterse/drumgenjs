/* jshint strict: false */
/* global before, after, describe, it */

const Browser = require('zombie');

const chai = require('chai');

var config = require("../config.js");
config.server.port = 9991;
config.tmpdir = "/tmp/";
const indexjs = require('../index.js');
const server = indexjs.app;

// this is in fact used; even though the assignment isn't
const should = chai.should();
const expect = require('chai').expect;
const assert = require('assert');

Browser.localhost('dg.apollolms.co.za', config.server.port);

describe('User interactions', function() {

    after(function() {
        indexjs.this_server.close();
    });

    describe('User visits app page', function() {

        const browser = new Browser();

        before(function(done) {
            this.timeout(5000);
            browser.visit('/static/page.html', done);
        });

        after(function() {
            browser.tabs.closeAll();
        });

        describe('random button changes image', function() {

            it('should be successful', function(done) {
                browser.assert.element('.pattern-image');
                var patimg = browser.html('.pattern-image');
                browser.click('.reload-image').then(function() {
                    var patimgafter = browser.html('.pattern-image');
                    browser.assert.success();
                    assert.notEqual(patimg, patimgafter);
                    done();
                });
            });
        });
    });

    describe('User visits worksheets', function() {

        const browser = new Browser();

        before(function(done) {
            this.timeout(10000);
            this.slow(8000);
            browser.visit('/worksheetfilter/4', done);
        });

        after(function() {
            browser.tabs.closeAll();
        });

        describe('Page rendering', function() {

            it('should be successful', function(done) {
                browser.assert.element('#footNavHolder');
                done();
            });
        });

        describe('Page toggle kicks', function() {

            it('should be successful', function(done) {

                browser.click('.toggle-kick').then(function() {
                browser.assert.evaluate('window.location.pathname', '/worksheetfilter/4');
                browser.assert.evaluate('window.location.search.indexOf("togglekick=true") >= 0 ', true);
                    browser.assert.success();
                    done();
                });
            });
        });
    });
});
