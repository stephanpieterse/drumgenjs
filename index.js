/* global require, module, __dirname */
/* jslint strict:false */

var express = require("express");
var musxml = require("./main.js");
var app = express();
var config = require("./config.js");
var serverPort = config.server.port;
var metrics = require('./metrics.js');
var prommetrics = require('./prommetrics.js');
var promclient = require('prom-client');
var prominit = require('./prominit.js');
var timers = require('./timers.js');
var cleanup = require('./cleanup.js');

var sanitize = require('./sanitize.js');

var Log = require('./logger.js');
var util = require('./util.js');
var appId = util.getOTP("appId");
prommetrics.appid = appId;

var queue = require('queue');
var q = new queue();
q.timeout = config.queue.timeout;
q.concurrency = config.queue.concurrency;
q.autostart = true;
q.on('timeout', function(continuejob, job) {
    metrics.increment('errors', 'q-timeouts');
    Log.error({
        job: job,
        continuejob: continuejob
    }, 'A q job timed out!');
});

cleanup.start(function() {
    Log.debug("Callback for cleanup script ran");
});

app.use(function metricTracker(req, res, next) {
    metrics.reqObjScraper(req);
    next();
});

app.use(function timingTracker(req, res, next) {
    timers.start(req.path);
    req._dgtimingstart = Date.now();
    res.on("finish", function() {
        timers.end(req.path);
        var time = Date.now() - req._dgtimingstart;
        metrics.increment('http-status', res.statusCode);
        prommetrics.cadd('http_requests_total', 1, {
            "status_code": res.statusCode,
            "path": req.path,
            "appid": appId
        });
        prommetrics.hobs('http_requests_timings', time, {
            "path": req.path,
            "appid": appId
        });
    });
    next();
});

app.use(function(req, res, next){
    res.setTimeout(15000, function(){
          Log.error("Client request returned with 503, we couldn't return it in time?");
          res.status(503);
          res.send();
        });

    next();
});

app.post("/analytics", function(req, res) {

    var chunk = '';

    req.on('data', function(data) {
        chunk += data;
    });

    req.on('end', function() {
        try {
            var obj = JSON.parse(chunk);
            prommetrics.hobs('analytics_user_pagetime', obj.timeOnPage, {
                "path": obj.pathname,
                "appid": appId
            });
            prommetrics.hobs('analytics_user_timehidden', obj.timeInState.hidden, {
                "path": obj.pathname,
                "appid": appId
            });
            prommetrics.hobs('analytics_user_timevisible', obj.timeInState.visible, {
                "path": obj.pathname,
                "appid": appId
            });
        } catch (e) {
            Log.error(e);
        }
    });
    res.status(201).send();
});

app.post("/feedback", function(req, res){
  res.status(204).send();
});

app.get("/prometheus", function(req, res) {
    res.send(promclient.register.metrics({
        timestamps: false
    }));
});

app.get("/metrics", function(req, res) {
    res.json(metrics.getMetrics());
});

app.get("/timers", function(req, res) {
    res.json(timers.timers);
});

app.get("/", function(req, res) {
    res.redirect("/static/home.html");
});

app.get("/health", function(req, res) {
    res.send("UP");
});

app.post("/remotelog", function(req, res) {
    Log.info({
        data: {},
        message: "remotelog"
    });
    res.status(201);
    res.send();
});

var getOptsFromReq = function(req) {
    if (!req.query) {
        return {};
    }
    // !!! future
    /// ("" + req.opts['a']).toLowerCase() === 'true'
    var mapArr = req.query["map"] || "";
    mapArr = mapArr.split(",");
    return {
        noNames: (req.query["noname"] === true || req.query["noname"] === 'true'),
        noRests: (req.query["norests"] === true || req.query["norests"] === 'true'),
        noMetronome: (req.query["nometro"] === true || req.query["nometro"] === 'true'),
        asBase64: (req.query["asbase64"] === 'true'),
        patlen: isNaN(parseInt(req.query["patlen"])) ? 8 : parseInt(req.query["patlen"]),
        nested: (req.query["nested"] === 'true'),
        tempo: isNaN(parseInt(req.query["tempo"])) ? null : parseInt(req.query["tempo"]),
        map: mapArr
    };
};

function publicGetPat(req, res) {

    var pat;
    if (req.query['patref']) {
        var ref = req.query['patref'];
        ref = sanitize.trimString(ref);
        //ref = sanitize.cleanString(ref);
        pat = JSON.parse(musxml.importBlocks(ref));
        res.setHeader('x-drumgen-patref', musxml.exportBlocks(pat));
        return pat;
    }

    var seed = req.query['seed'] || "public";
    seed = sanitize.trimString(seed);

    //req.query["nometro"] = 'true';
    req.query["noname"] = 'true';
    //req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);
    var patlen = queryOpts.patlen || 8;

    var tupmap = sanitize.tuples(req.query['tuples']);

    var num = util.getOTP('base' + seed);
    var tupnum = util.getOTP('tups' + seed);

    var mappings = ['-', 'r', 'R', 'l', 'L'];
    if (queryOpts.noRests) {
        mappings.shift();
    }
    pat = musxml.convertNumSimple(num, patlen, mappings);
    pat = JSON.parse(musxml.importBlocks(pat));

    Log.debug({
        oldpat: pat
    });

    var tupset = musxml.convertNumToTuple(tupnum, patlen, tupmap);
    Log.trace({
        tupset: tupset
    });
    for (var t in tupset) {

        if (tupset[t] !== '1' && tupset[t] !== 1) {

            var tnum = util.getOTP('tup' + t + seed);
            var mt = musxml.getMappedTuple(tupset[t], tnum, mappings);
            Log.debug({
                mappedTuple: mt,
                tnum: tnum
            }, "Mapped number to tuple");

            pat[0][t] = mt;
        }
    }

    Log.debug({
        newpat: pat
    });

    res.setHeader('x-drumgen-patref', musxml.exportBlocks(pat));
    return pat;
}

app.get("/public/pattern", function(req, res) {
    var ppat = publicGetPat(req, res);
    res.send({
        "patref": musxml.exportBlocks(ppat)
    });
});

app.get("/public/refresh/audio", function(req, res) {

    //req.query["map"] = "sn";

    Log.debug(JSON.stringify(req.headers));
    var ppat = '';
    try {
        var patref = req.headers['x-drumgen-patref'] || req.query['patref'];
        if (patref) {
            Log.debug("going to import for refresh :: " + patref);
            ppat = JSON.parse(musxml.importBlocks(patref));
        } else {
            throw "No pattern!";
        }
    } catch (e) {
        Log.error(e);
        res.status(500);
        res.send({
            reason: "Cannot detect a pattern to refresh"
        });
        return;
    }
    var execFunc = function(cb){
    musxml.getAudio(ppat, getOptsFromReq(req), function(err, auData){
      if (err) {
          Log.error("getAudio returned an error");
          res.status(500);
          res.send("audio generation/retrieval error: " + err);
          cb();
          return;
      }

      res.writeHead(200, {
          'Content-Type': auData.contentType
      });
      res.end(auData.data);
      cb();
      return;
    });
    };
    execFunc.timeout = 1000;
    q.push(execFunc);

});

app.get("/public/audio", function(req, res) {

    req.query["noname"] = 'true';
    //req.query["map"] = "sn";

    var ppat = publicGetPat(req, res);
    var opts = getOptsFromReq(req);
    var execFunc = function(cb){
    musxml.getAudio(ppat, opts, function(err, auData){
      if (err) {
          Log.error("getAudio returned an error");
          res.status(500);
          res.send("audio generation/retrieval error: " + err);
          cb();
          return;
      }

      res.writeHead(200, {
          'Content-Type': auData.contentType
      });
      res.end(auData.data);
      cb();
      return;
    });
    };
    execFunc.timeout = 1000;
    q.push(execFunc);
});

app.get("/public/image", function(req, res) {

    req.query["nometro"] = true;
    req.query["noname"] = 'true';
    //req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);

    var ppat = publicGetPat(req, res);
    var execFunc = function(cb){
      musxml.getImage(ppat, queryOpts,  function(err, imgData){
      if (err) {
          Log.error("getImage returned an error");
          res.status(500);
          res.send("image retrieval error: " + err);
          cb();
          return;
      }
  
      res.writeHead(200, {
          'Content-Type': imgData.contentType
      });
      res.end(imgData.data);
      cb(); 
      });
    };
    execFunc.timeout = 3000;
    q.push(execFunc);

});

app.get("/convertnum", function(req, res) {
    Log.debug("num = " + req.query['num']);
    Log.debug("len = " + req.query['patlen']);
    // we need to pass this a single opts obj
    var sResult = musxml.convertNum(req.query['num'], req.query['patlen'], req.query['tuples']);
    res.send(sResult);
});

app.get("/convertmulti", function(req, res) {
    Log.debug("num = " + req.query['nums']);
    Log.debug("len = " + req.query['patlen']);
    var sResult = musxml.convertMulti(req.query['nums'], req.query['patlen']);
    res.send(sResult);
});

app.get("/public/patreftocustommap/:patref", function(req, res){
 
	var patref = req.params['patref'];
  var blocks = JSON.parse(musxml.importBlocks(patref));
	var mappings = ['-','x','X','l','L','r','R'];

	function umap(obj){
	  for (i in obj){
	  	if (Array.isArray(obj[i])){
	  		obj[i] = umap(obj[i]);
	  	}else{
	  		obj[i] = mappings.indexOf(obj[i]);
	  	}
	  }
    return obj;
	}

	arr = umap(blocks);
	ret = {unmapped:arr};
	res.send(ret);
});

app.get("/public/custommaptopatref/:cmap", function(req,res){
	var arr = JSON.parse(req.params['cmap']);
	var mappings = ['-','x','X','l','L','r','R'];
	function rmap(obj){
	for (i in obj){
		if (Array.isArray(obj[i])){
			obj[i] = rmap(obj[i]);
		}else{
			obj[i] = mappings[obj[i]];
		}
	}
		return obj;
	}
	arr = rmap(arr);
	ret = {mapped:arr, patref:musxml.exportBlocks(arr)};
	res.send(ret);
});

app.get("/worksheet/:patlen", function(req, res) {
    var opts = {};
    opts.patlen = req.params['patlen'] || 4;
    opts.pagenum = req.query['page'] || 1;
    opts.blanks = req.query['blanks'];
    opts.rests = req.query['rests'];

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Connection': 'Transfer-Encoding'
    });

    var Readable = require('stream').Readable;
    var rs = new Readable();
    rs._read = function(){};
    rs.pipe(res);
    musxml.getAll8Stream(rs, opts);
});

app.use("/favicon.ico", function(req, res) {
    res.redirect("/static/favicon.ico");
});

app.use("/static", express.static("static"));

app.use(function errorHandler(err, req, res, next) {

    Log.error(err);

    if (!res.headersSent) {

        res.status(500);
        res.send({
            reason: "An error occured."
        });
    }

    return next(err);
});

app.use(function missingHandler(req, res) {
    res.status(404).sendFile(__dirname + "/static/404.html");
});

app.disable('x-powered-by');
var this_server = app.listen(serverPort, function() {
    Log.info("Started on " + serverPort);
    Log.debug(musxml);
});

module.exports = {
    app: app,
    this_server: this_server
};
