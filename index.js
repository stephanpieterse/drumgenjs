/* global require, module, __dirname, process, Buffer */
/* jslint strict:false */

var express = require("express");
var common = require('./commonblockfuncs.js');
var musxml = require("./main.js");
var staticpages = require("./staticpages.js");
var app = express();
var config = require("./config.js");
var serverPort = config.server.port;
var prommetrics = require('./prommetrics.js');
var promclient = require('prom-client');
var prominit = require('./prominit.js');
prominit.init();
var timers = require('./timers.js');
var cleanup = require('./cleanup.js');
var sanitize = require('./sanitize.js');
var crypto = require('crypto');

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
    prommetrics.cadd('drumgen_errors_qtimeout', 1, {
        "appid": appId
    });
    Log.error({
        job: job,
        continuejob: continuejob
    }, 'A q job timed out!');
});

cleanup.start(function() {
    Log.debug("Callback for cleanup script ran");
});

function cloneObj(ob) {
    return JSON.parse(JSON.stringify(ob));
}

function cacheResponseBody() {
    var resCache = {};
    return function(req, res, next) {

        var cachePath = req.originalUrl + JSON.stringify(req.query);
        if (resCache[cachePath]) {
            res.send(resCache[cachePath]);
            return;
        }

        var origWrite = res.write;
        var origEnd = res.end;

        var chunks = [];

        res.write = function(chunk) {
            chunks.push(chunk);
            return origWrite.apply(res, arguments);
        };

        res.end = function(chunk) {
            if (chunk) {
                if (typeof chunk === 'string') {
                    chunk = Buffer.from(chunk);
                }
                chunks.push(chunk);
            }
            var body = Buffer.concat(chunks).toString('utf8');
            resCache[cachePath] = body;
            origEnd.apply(res, arguments);
        };

        next();
    };
}


app.use(function timingTracker(req, res, next) {
    timers.start(req.route ? req.route.path : req.path);
    req._dgtimingstart = Date.now();
    res.on("finish", function() {
        timers.end(req.route ? req.route.path : req.path);
        var time = Date.now() - req._dgtimingstart;
        prommetrics.cadd('http_requests_total', 1, {
            "status_code": res.statusCode,
            "path": req.route ? req.route.path : req.path,
            "appid": appId
        });
        prommetrics.hobs('http_requests_timings', time, {
            "path": req.route ? req.route.path : req.path,
            "appid": appId
        });
    });
    next();
});

app.use(function(req, res, next) {
    res.setTimeout(60 * 1000, function() {
        Log.error("Client request returned with 503, we couldn't return it in time.");
        var err = new Error('Request timeout');
        err.status = 503;
        next(err);
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
            prommetrics.hobs('analytics_resources_pagetotal', obj.pageEntries.length, {
                "path": obj.pathname,
                "appid": appId
            });
        } catch (e) {
            Log.error(e);
        }
    });
    res.status(201).send();
});


app.get("/prometheus", function(req, res) {
    res.send(promclient.register.metrics({
        timestamps: false
    }));
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


var getOptsFromReq = function(req) {
    if (!req.query) {
        return {};
    }
    // !!! future
    /// ("" + req.opts['a']).toLowerCase() === 'true'
    var mapArr = req.query["map"] || "sn";
    mapArr = mapArr.split(",");
    return {
        noNames: (req.query["noname"] !== false || req.query["noname"] !== 'false'),
        noRests: (req.query["norests"] === true || req.query["norests"] === 'true'),
        flams: (req.query["flams"] === true || req.query["flams"] === 'true'),
        tremolos: (req.query["tremolos"] === true || req.query["tremolos"] === 'true'),
        noMetronome: (req.query["nometro"] === true || req.query["nometro"] === 'true'),
        asBase64: (req.query["asbase64"] === 'true'),
        patlen: isNaN(parseInt(req.query["patlen"])) ? 8 : parseInt(req.query["patlen"]),
        nested: (req.query["nested"] === 'true'),
        tempo: isNaN(parseInt(req.query["tempo"])) ? null : parseInt(req.query["tempo"]),
        layers: isNaN(parseInt(req.query["layers"])) ? 1 : parseInt(req.query["layers"]),
        tupmap: sanitize.tuples(req.query['tuples']),
        map: mapArr
    };
};


// personal reference function
//function generateSetPatternTest(opts) {
//
//    var layers = opts.layers;
//    var queryOpts = opts.queryOpts;
//    var tupmap = opts.tupmap;
//    var num = opts.num;
//    var tupnum = opts.tupnum;
//    var tnum = opts.tnum;
//    var patlen = queryOpts.patlen || 8;
//    var pat;
//
//    var globpat = [];
//    //start layer loop
//    for (var layer = 0; layer < layers; layer += 1) {
//        pat = [];
//        var mappings = ['r', 'R', 'l', 'L'];
//
//        pat = common.convertNumSimple(num, patlen, mappings);
//        pat = JSON.parse(common.importBlocks(pat));
//
//        var tupset = common.convertNumToTuple(tupnum, patlen, tupmap);
//        for (var t in tupset) {
//            if (tupset[t] !== '1' && tupset[t] !== 1) {
//                var mt = common.getMappedTuple(tupset[t], tnum, mappings);
//                pat[0][t] = mt;
//            }
//        }
//        globpat[layer] = pat[0];
//    }
//    //   end layer loop
//    return globpat;
//
//}

function generateNewPattern(opts) {

    var layers = opts.layers;
    var queryOpts = opts.queryOpts;
    var tupmap = opts.tupmap;
    var seed = opts.seed;
    var patlen = queryOpts.patlen || 8;
    var pat;

    var globpat = [];
    //start layer loop
    for (var layer = 0; layer < layers; layer += 1) {
        pat = [];
        var lseed = ((layer + 1) * 4) * (layers * 4);
        var num = util.getOTP('base' + lseed + seed);
        var tupnum = util.getOTP('tups' + lseed + seed);


        var mappings = ['-', 'r', 'R', 'l', 'L'];
        if (queryOpts.noRests) {
            mappings.shift();
        }
        if (queryOpts.flams) {
            mappings.push('u', 'U', 'i', 'I');
        }
        if (queryOpts.tremolos) {
            mappings.push('o', 'O');
        }
        if (queryOpts.flams && queryOpts.tremolos) {
            mappings.push('y', 'Y');
        }

        pat = common.convertNumSimple(num, patlen, mappings);
        pat = JSON.parse(common.importBlocks(pat));

        var tupset = common.convertNumToTuple(tupnum, patlen, tupmap);

        Log.debug({
            layer: layer,
            layers: layers,
            lseed: lseed,
            num: num,
            tupnum: tupnum,
            tupset: tupset
        });

        for (var t in tupset) {

            if (tupset[t] !== '1' && tupset[t] !== 1) {

                var tnum = util.getOTP('tup' + t + lseed + seed);
                var mt = common.getMappedTuple(tupset[t], tnum, mappings);
                Log.debug({
                    mappedTuple: mt,
                    tnum: tnum
                }, "Mapped number to tuple");

                pat[0][t] = mt;
            }
        }
        Log.debug({
            globpat: globpat,
            pat: pat

        });
        globpat[layer] = pat[0];
    }
    //   end layer loop
    return globpat;
}

function isPatternInteresting(pat) {

    var stats = util.patternStats(pat);
    var interesting = true;

    if (stats.longestConsecutiveL > 2 || stats.longestConsecutiveR > 2) {
        interesting = false;
    }

    if (stats.longestConsecutiveRepeat > 3) {
        interesting = false;
    }

    prommetrics.cadd('app_pattern_interesting', 1, {
        "state": "" + interesting,
        "appid": appId
    });
    return interesting;
}


function publicGetPat(req) {

    var pat;
    if (req.query['patref']) {
        var ref = req.query['patref'];
        ref = sanitize.trimString(ref);
        pat = JSON.parse(common.importBlocks(ref));
        return pat;
    }

    var seed = req.query['seed'] || "public";
    seed = sanitize.trimString(seed);

    //req.query["nometro"] = 'true';
    req.query["noname"] = 'true';
    //req.query["map"] = "sn";
    var queryOpts = getOptsFromReq(req);
    var patlen = queryOpts.patlen || 8;
    var layers = queryOpts.layers;
    var tupmap = queryOpts.tupmap;

    prommetrics.hobs('app_pattern_tempos', parseInt(req.query['tempo'] || 120), {
        "appid": appId
    });
    prommetrics.cadd('app_pattern_patlen', 1, {
        "patlen": patlen,
        "appid": appId
    });
    prommetrics.cadd('app_pattern_layers', 1, {
        "layers": layers,
        "appid": appId
    });
    prommetrics.cadd('app_pattern_tuples', 1, {
        "tuples": tupmap.join('-'),
        "appid": appId
    });

    var globpat = generateNewPattern({
        queryOpts: queryOpts,
        tupmap: tupmap,
        layers: layers,
        seed: seed
    });
    return globpat;
}

// personal reference function
//function privatepublicGetPat(req) {
//    var queryOpts = getOptsFromReq(req);
//    //var patlen = queryOpts.patlen || 8;
//    var layers = queryOpts.layers;
//    var tupmap = queryOpts.tupmap;
//
//
//    for (var i = 0; i < 10; i++) {
//        for (var j = 0; j < 10; j++) {
//            for (var k = 0; k < 10; k++) {
//
//                var globpat = generateSetPatternTest({
//                    queryOpts: queryOpts,
//                    tupmap: tupmap,
//                    layers: layers,
//                    num: i,
//                    tupnum: j,
//                    tnum: k, // this needs a seperate group of nested loops, and be passed as an array as each tuple needs a new num
//                });
//                Log.info(globpat);
//            }
//        }
//    }
//}


app.get("/public/pattern", function(req, res) {

    var ppat = publicGetPat(req);
    var isPatInt = isPatternInteresting(ppat);
    var needInterest = req.query['interest'];

    if (needInterest) {
        var maxRetry = 1000;
        var curRetry = 0;
        var reseed = 0;
        var startseed = req.query.seed;
        while (isPatInt === false && maxRetry > curRetry) {
            req.query.seed = startseed + reseed;
            ppat = publicGetPat(req);
            isPatInt = isPatternInteresting(ppat);
            reseed += 2;
            curRetry += 1;
        }
    }

    res.setHeader('x-drumgen-patref', common.exportBlocks(ppat));
    res.setHeader('x-drumgen-interesting', isPatInt);
    res.send({
        "patref": common.exportBlocks(ppat)
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
            ppat = JSON.parse(common.importBlocks(patref));
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

    var execFunc = function(cb) {
        musxml.getAudio(ppat, getOptsFromReq(req), function(err, auData) {
            if (err) {
                Log.error("getAudio returned an error");
                safeSend(res, 500, {}, "Audio generation/retrieval error: " + err);
                cb();
                return;
            }

            safeSend(res, 200, {
                'Content-Type': auData.contentType
            }, auData.data);
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

    var ppat = publicGetPat(req);
    var isPatInt = isPatternInteresting(ppat);
    res.setHeader('x-drumgen-patref', common.exportBlocks(ppat));
    res.setHeader('x-drumgen-interesting', isPatInt);
    var opts = getOptsFromReq(req);
    var execFunc = function(cb) {
        musxml.getAudio(ppat, opts, function(err, auData) {
            if (err) {
                Log.error("getAudio returned an error");
                safeSend(res, 500, {}, "audio generation/retrieval error: " + err);
                cb();
                return;
            }

            safeSend(res, 200, {
                'Content-Type': auData.contentType
            }, auData.data);
            cb();
            return;
        });
    };
    execFunc.timeout = 1000;
    q.push(execFunc);
});

function safeSend(res, rstatus, headers, body) {
    if (!res.headersSent) {
        if (!headers['ETag']) {
            headers['ETag'] = '"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
        }
        res.writeHead(rstatus, headers);
        res.end(body);
    } else {
        Log.error('Send was not safe, not attempted');
    }
}

app.get("/public/rawfile", function(req, res) {

    //req.query["nometro"] = true;
    req.query["noname"] = 'true';
    //req.query["map"] = "sn";

    var ppat = publicGetPat(req);
    var isPatInt = isPatternInteresting(ppat);
    res.setHeader('x-drumgen-patref', common.exportBlocks(ppat));
    res.setHeader('x-drumgen-interesting', isPatInt);
    var queryOpts = getOptsFromReq(req);
    var execFunc = function(cb) {
        musxml.getRawFile(ppat, queryOpts, function(err, fileData) {
            Log.debug({
                pat: ppat
            }, 'received raw request');
            if (err) {
                Log.error("getRawFile returned an error");
                safeSend(res, 500, {}, "Raw file retrieval error: " + err);
                cb();
                return;
            }

            safeSend(res, 200, {
                'Content-Type': 'text/plain'
            }, fileData);
            cb();
        });
    };
    execFunc.timeout = 1000;
    q.push(execFunc);

});

app.get("/public/image", function(req, res) {

    //req.query["nometro"] = true;
    req.query["noname"] = 'true';
    //req.query["map"] = "sn";

    var ppat = publicGetPat(req);
    var isPatInt = isPatternInteresting(ppat);
    res.setHeader('x-drumgen-patref', common.exportBlocks(ppat));
    res.setHeader('x-drumgen-interesting', isPatInt);
    var queryOpts = getOptsFromReq(req);
    Log.debug({
        pat: ppat
    }, 'received rest request');
    var execFunc = function(cb) {
        musxml.getImage(ppat, queryOpts, function(err, imgData) {
            Log.debug({
                pat: ppat
            }, 'received image request');
            if (err) {
                Log.error("getImage returned an error");
                safeSend(res, 500, {}, "Image retrieval error: " + err);
                cb();
                return;
            }

            safeSend(res, 200, {
                'Content-Type': imgData.contentType
            }, imgData.data);
            cb();
        });
    };
    execFunc.timeout = 3000;
    q.push(execFunc);

});

app.get("/public/image/ref/:patref", function(req, res) {

    // uses same code as image, can we make this common?

    req.query['patref'] = req.params['patref'];
    var ppat = publicGetPat(req);
    var isPatInt = isPatternInteresting(ppat);
    res.setHeader('x-drumgen-patref', common.exportBlocks(ppat));
    res.setHeader('x-drumgen-interesting', isPatInt);
    var queryOpts = getOptsFromReq(req);
    Log.debug({
        pat: ppat
    }, 'received rest request');
    var execFunc = function(cb) {
        musxml.getImage(ppat, queryOpts, function(err, imgData) {
            Log.debug({
                pat: ppat
            }, 'received image request');
            if (err) {
                Log.error("getImage returned an error");
                safeSend(res, 500, {}, "Image retrieval error: " + err);
                cb();
                return;
            }

            safeSend(res, 200, {
                'Content-Type': imgData.contentType
            }, imgData.data);
            cb();
        });
    };
    execFunc.timeout = 3000;
    q.push(execFunc);

});


function blockstocustommap(blocks) {
    var mappings = ['-', 'x', 'X', 'l', 'L', 'r', 'R', 'u', 'U', 'i', 'I', 'o', 'O', 'y', 'Y'];

    function umap(obj) {
        for (var i in obj) {
            if (Array.isArray(obj[i])) {
                obj[i] = umap(obj[i]);
            } else {
                obj[i] = mappings.indexOf(obj[i]);
            }
        }
        return obj;
    }

    var arr = umap(cloneObj(blocks));
    return arr;
}

app.get("/public/patreftocustommap/:patref", function(req, res) {

    var patref = req.params['patref'];
    var blocks = JSON.parse(common.importBlocks(patref));

    var arr = blockstocustommap(blocks);
    var ret = {
        unmapped: arr
    };
    res.send(ret);
});


function custommaptoblocks(arr) {

    var mappings = ['-', 'x', 'X', 'l', 'L', 'r', 'R', 'u', 'U', 'i', 'I', 'o', 'O', 'y', 'Y'];

    function rmap(obj) {
        for (var i in obj) {
            if (Array.isArray(obj[i])) {
                obj[i] = rmap(obj[i]);
            } else {
                obj[i] = mappings[obj[i]];
            }
        }
        return obj;
    }
    arr = rmap(cloneObj(arr));
    return arr;
}
app.get("/public/custommaptopatref/:cmap", function(req, res) {
    var cmapParam = req.params['cmap'];
    cmapParam = sanitize.trimString(cmapParam);
    cmapParam = cmapParam.replace(/[^\[\],0-9]/g, '');
    //var arr = JSON.parse(req.params['cmap']);
    var arr = JSON.parse(cmapParam);

    arr = custommaptoblocks(arr);
    var ret = {
        mapped: arr,
        patref: common.exportBlocks(arr)
    };
    res.send(ret);
});


function blockstoinvert(blocks) {

    var regmappings = ['l', 'L', 'r', 'R', 'u', 'U', 'i', 'I', 'o', 'O', 'y', 'Y'];
    var invmappings = ['r', 'R', 'l', 'L', 'i', 'I', 'u', 'U', 'O', 'o', 'Y', 'y'];

    function imap(obj) {
        for (var i in obj) {
            if (Array.isArray(obj[i])) {
                obj[i] = imap(obj[i]);
            } else {
                if (regmappings.indexOf(obj[i]) >= 0) {
                    obj[i] = invmappings[regmappings.indexOf(obj[i])];
                }
            }
        }
        return obj;
    }

    var arr = imap(cloneObj(blocks));
    return arr;
}

app.get("/public/custom/invert/cmap/:cmap", function(req, res) {

    var cmapParam = req.params['cmap'];
    cmapParam = sanitize.trimString(cmapParam);
    cmapParam = cmapParam.replace(/[^\[\],0-9]/g, '');
    //var arr = JSON.parse(req.params['cmap']);
    var arr = JSON.parse(cmapParam);
    arr = custommaptoblocks(arr);
    arr = blockstoinvert(arr);
    var ret = {
        inverted: arr,
        mapped: blockstocustommap(arr),
        patref: common.exportBlocks(arr)
    };
    res.send(ret);
});

app.get("/public/custom/invert/patref/:patref", function(req, res) {

    var patref = req.params['patref'];
    var blocks = JSON.parse(common.importBlocks(patref));
    var arr = blockstoinvert(blocks);
    var ret = {
        inverted: arr,
        mapped: blockstocustommap(arr),
        patref: common.exportBlocks(arr)
    };
    res.send(ret);
});

var responseCacher = cacheResponseBody();

app.get("/worksheetfilter/:patlen", responseCacher, function(req, res) {
    var opts = {};
    opts.patlen = parseInt(req.params['patlen']) || 4;
    opts.pagenum = parseInt(req.query['page']) || 1;
    opts.frompage = parseInt(req.query['frompage']) || 1;
    opts.blanks = req.query['blanks'];
    opts.rests = req.query['rests'] === "true" ? true : false;
    opts.kick = req.query['kick'] === "true" ? true : false;
    opts.nosticking = req.query['nosticking'] === "true" ? true : false;
    opts.toggles = {};
    opts.toggles.sticking = req.query['togglesticking'] === "true" ? true : false;
    opts.toggles.rests = req.query['togglerests'] === "true" ? true : false;
    opts.toggles.kick = req.query['togglekick'] === "true" ? true : false;
    opts.itemsPerPage = isNaN(parseInt(req.query['ipp'])) ? config.worksheet.pageItems : parseInt(req.query['ipp']);

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Connection': 'Transfer-Encoding'
    });

    var Readable = require('stream').Readable;
    var rs = new Readable();
    rs._read = function() {};
    rs.pipe(res);
    staticpages.getAll8StreamFilter(rs, opts, function(ppat) {
        return isPatternInteresting(ppat);
    });
});

app.get("/worksheetmap/:patlen", responseCacher, function(req, res) {
    var opts = {};
    opts.patlen = parseInt(req.params['patlen']) || 4;
    opts.pagenum = parseInt(req.query['page']) || 1;
    opts.frompage = parseInt(req.query['frompage']) || 1;
    opts.blanks = req.query['blanks'];
    opts.rests = req.query['rests'] === "true" ? true : false;
    opts.kick = req.query['kick'] === "true" ? true : false;
    opts.nosticking = req.query['nosticking'] === "true" ? true : false;
    opts.toggles = {};
    opts.toggles.sticking = req.query['togglesticking'] === "true" ? true : false;
    opts.toggles.rests = req.query['togglerests'] === "true" ? true : false;
    opts.toggles.kick = req.query['togglekick'] === "true" ? true : false;
    opts.itemsPerPage = config.worksheet.pageItems;

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Connection': 'Transfer-Encoding'
    });

    var Readable = require('stream').Readable;
    var rs = new Readable();
    rs._read = function() {};
    rs.pipe(res);
    staticpages.getAll8StreamFilterMap(rs, opts, function(ppat) {
        return isPatternInteresting(ppat);
    });
});

app.use("/favicon.ico", function(req, res) {
    res.redirect("/static/favicon.ico");
});

app.use("/static", express.static("static"));

app.use(function errorHandler(err, req, res, next) {

    Log.error(err);
    if (!res.headersSent) {
        res.status(err.status);
        res.send({
            reason: "An error occured.",
            err: err
        });
    }
    return next(err);
});

app.use(function missingHandler(req, res) {
    res.status(404).sendFile(__dirname + "/static/404.html");
});

app.disable('x-powered-by');
var healthInterval = {};
var healthStatus = {};
var this_server = app.listen(serverPort, function() {
    Log.info("Started on " + serverPort);

    healthInterval.lily = setInterval(function() {
        musxml.healthCheck(function(health) {
            healthStatus.lily = health;
        });
    }, 2 * 60 * 1000);

    healthInterval.main = setInterval(function() {
        for (var h in healthStatus) {
            if (healthStatus[h].up !== true) {
                Log.error(h + ' is reporting unhealthy!');
                if (healthStatus[h].fatal === true) {
                    Log.error(healthStatus[h].reason);
                    process.exit(1);
                }
            }
        }
    }, 1 * 60 * 1000);

});

this_server.on('close', function() {
    Log.info('Shutdown section');
    for (var h in healthInterval) {
        clearInterval(healthInterval[h]);
    }
});

module.exports = {
    app: app,
    this_server: this_server
};
