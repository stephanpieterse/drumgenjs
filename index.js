/* global require, module */
/* jslint strict:false */

var startpath = '/opt/app';

var express = require("express");
var musxml = require("./main.js");
var app = express();
var config = require("./config.js");
var serverPort = config.server.port;
var metrics = require('./metrics.js');
var timers = require('./timers.js');

var sanitize = require('./sanitize.js');

var Log = require('./logger.js');
var util = require('./util.js');

app.use(function metricTracker(req, res, next) {
    metrics.reqObjScraper(req);
    next();
});

app.use(function timingTracker(req, res, next) {
    timers.start(req.path);
    res.on("finish", function() {
        timers.end(req.path);
        metrics.increment('http-status', res.statusCode);
    });
    next();
});

app.get("/metrics", function(req, res) {
    res.json(metrics.getMetrics());
});

app.get("/timers", function(req, res) {
    res.json(timers.timers);
});

app.get("/", function(req, res) {
    res.redirect("/static/page.html");
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
    return {
        noNames: (req.query["noname"] === true || req.query["noname"] === 'true'),
        noMetronome: (req.query["nometro"] === true || req.query["nometro"] === 'true'),
        asBase64: (req.query["asbase64"] === 'true'),
        patlen: isNaN(req.query["patlen"]) ? 8 : parseInt(req.query["patlen"]),
        nested: (req.query["nested"] === 'true'),
        tempo: isNaN(req.query["tempo"]) ? null : parseInt(req.query["tempo"]),
        map: req.query["map"] || []
    };
};

app.get("/image", function(req, res) {
    var pat;
    if (req.query["pat"]) {
        pat = JSON.parse(musxml.importBlocks(req.query["pat"]));
    } else {
        pat = musxml.generateBlocks({});
    }

    musxml.getImage(res, pat, getOptsFromReq(req));
});
//
//app.get("/audio", function(req, res) {
//    var pat;
//    if (req.query["pat"]) {
//        pat = JSON.parse(musxml.importBlocks(req.query["pat"]));
//    } else {
//        pat = musxml.generateBlocks({});
//    }
//
//    musxml.getAudio(res, pat, getOptsFromReq(req));
//});

function publicGetPat(req, res) {

    var seed = req.query['seed'] || "public";
    seed = sanitize.trimString(seed);

    req.query["nometro"] = 'true';
    req.query["noname"] = 'true';
    req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);
    var patlen = queryOpts.patlen || 8;

    var tupmap = sanitize.tuples(req.query['tuples']);

    var num = util.getOTP('base' + seed);
    var tupnum = util.getOTP('tups' + seed);

    var pat = musxml.convertNumSimple(num, patlen);
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
            var mt = musxml.getMappedTuple(tupset[t], tnum);
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

app.get("/public/refresh/audio", function(req, res) {

    req.query["map"] = "sn";

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
    musxml.getAudio(res, ppat, getOptsFromReq(req));

});

app.get("/public/audio", function(req, res) {

    //req.query["nometro"] = true;
    req.query["noname"] = 'true';
    req.query["map"] = "sn";

    var ppat = publicGetPat(req, res);
    musxml.getAudio(res, ppat, getOptsFromReq(req));
});

app.get("/public/image", function(req, res) {

    req.query["nometro"] = true;
    req.query["noname"] = 'true';
    req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);

    var ppat = publicGetPat(req, res);
    musxml.getImage(res, ppat, queryOpts);

});

app.get("/convertnum", function(req, res) {
    Log.debug("num = " + req.query['num']);
    Log.debug("len = " + req.query['patlen']);
    // we need to pass this a single opts obj
    musxml.convertNum(req, res, req.query['num'], req.query['patlen'], req.query['tuples']);
});

app.get("/convertmulti", function(req, res) {
    Log.debug("num = " + req.query['nums']);
    Log.debug("len = " + req.query['patlen']);
    musxml.convertMulti(req, res, req.query['nums'], req.query['patlen']);
});


app.get("/all8/:patlen", function(req, res) {
    var patlen = req.params['patlen'] || 4;
    musxml.getAll8(req, res);
});

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

app.use("/favicon.ico", function(req, res) {
    res.sendFile(startpath + "/static/favicon.ico");
});

app.use("/static", express.static("static"));

app.disable('x-powered-by');
var this_server = app.listen(serverPort, function() {
    Log.info("Started on " + serverPort);
    Log.debug(musxml);
});

module.exports = {
    app: app,
    this_server: this_server
};
