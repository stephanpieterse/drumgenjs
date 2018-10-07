/* global require */
/* jslint strict:false */

var express = require("express");
var musxml = require("./main.js");
var app = express();
var config = require("./config.js");
var serverPort = config.server.port;
var metrics = require('./metrics.js');

var sanitize = require('./sanitize.js');

var Log = require('./logger.js');
var util = require('./util.js');

app.use(function metricTracker(req, res, next) {
    metrics.reqObjScraper(req);
    next();
});

app.get("/metrics", function(req, res) {
    res.json(metrics.getMetrics());
});

app.get("/", function(req, res) {
    res.send("Hi.");
});

app.get("/health", function(req, res) {
    res.send("UP");
});

app.post("/remotelog", function(req, res) {
    Log.info({
        //     data: JSON.stringify({}),
        message: "remotelog"
    });
    res.status(201);
    res.send();
});

var getOptsFromReq = function(req) {
    if (!req.query) {
        return {};
    }
    return {
        map: req.query["map"],
        noNames: req.query["noname"] || true,
        noMetronome: req.query["nometro"] || true,
        asBase64: (req.query["asbase64"] === 'true'),
        patlen: req.query["patlen"] || 8
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

app.get("/audio", function(req, res) {
    var pat;
    if (req.query["pat"]) {
        pat = JSON.parse(musxml.importBlocks(req.query["pat"]));
    } else {
        pat = musxml.generateBlocks({});
    }

    musxml.getAudio(res, pat, getOptsFromReq(req));
});

function publicGetPat(req, res) {

    var seed = req.query['seed'] || "public";

    req.query["nometro"] = true;
    req.query["noname"] = true;
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

        if (tupset[t] !== '1') {

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

app.get("/public/audio", function(req, res) {

    req.query["nometro"] = true;
    req.query["noname"] = true;
    req.query["map"] = "sn";

    var ppat = publicGetPat(req, res);
    musxml.getAudio(res, ppat, getOptsFromReq(req));
});

app.get("/public/image", function(req, res) {

    req.query["nometro"] = true;
    req.query["noname"] = true;
    req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);

    var ppat = publicGetPat(req, res);
    musxml.getImage(res, ppat, queryOpts);

});

app.get("/page", function(req, res) {
    var pat = musxml.generateBlocks({});
    musxml.getPage(req, res, pat);
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

app.get("/accent", function(req, res) {
    musxml.getAccent(req, res);
});

app.get("/all8", function(req, res) {
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

app.use("/static", express.static("static"));

app.disable('x-powered-by');
app.listen(serverPort, function() {
    Log.info("Started on " + serverPort);
    Log.debug(musxml);
});
