/* jshint strict:false */
/* global module, require */

var config = require('./config.js');
var util = require('./util.js');
var perscache = require('persistent-cache');
var savedcache = perscache({'name':'metrics'});

function reqObjScraper(req){
 visitor(req.headers['x-drumgen-id']);
 seeds(req.query['seed']);
 path(req.path);
    genericAdder('user-agent', req.headers['user-agent']);
    genericAdder('referers', req.headers['referer']);
}

var globalkey = 'globalset-metrics';
var metrics = savedcache.getSync(globalkey) || {};

function visitor(id) {
   genericAdder("visitors", id);
}

function path(id) {
   genericAdder("paths", id);
}

function seeds(id) {
   id = id || "";
   if(id.indexOf('x-dg-app') === 0){
     genericAdder("seeds", 'x-dg-app');
   } else {
     genericAdder("seeds", id);
   }
}

function genericAdder(type, id){
    var t = metrics[type] || {};
    t[id] = t[id] || {};
    t[id].hits = t[id].hits || 0;
    t[id].hits = t[id].hits + 1;
    metrics[type] = t;
		save();
}

function genericAverage(type, id, amount){
    var t = metrics[type] || {};
    t[id] = t[id] || {};
    t[id].hits = t[id].hits || 0;
    t[id].hits =( t[id].hits + amount) / 2;
    metrics[type] = t;
		save();
}
function save(){
	savedcache.put(globalkey, metrics);
}

function getMetrics() {
    return metrics;
}

module.exports = {
    visitor: visitor,
    path: path,
    seeds: seeds,
    getMetrics: getMetrics,
    reqObjScraper: reqObjScraper
};
