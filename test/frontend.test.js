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

Browser.localhost('drumgen-dev.apollolms.co.za', config.server.port);

describe('User visits app page', function() {

    const browser = new Browser();

    before(function(done) {
        browser.visit('/static/page.html', done);
    });

    after(function() {
        indexjs.this_server.close();
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
