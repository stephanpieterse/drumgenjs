/* jshint strict:false */
/* global require, module, setInterval, clearInterval */

var config = require("./config.js");
var fs = require('fs');
var Log = require('./logger.js');
var execSync = require('child_process').execSync;
var prommetrics = require('./prommetrics.js');

var cleanInterval;
var reportInterval;

var intervalCallbacks = [];

function shouldDeleteFile(filename) {
    var curTime = parseInt(Date.now() / 1000);
    var oldestTime = curTime - config.tmpMaxAge;
    try {
        var data = fs.readFileSync(filename, 'utf8');
        var flines = data.split("\n");
        for (var i in flines) {
            if (flines[i].indexOf('%') !== 0) {
                continue;
            }
            if (flines[i].indexOf('gendate') >= 0) {
                var tdate = flines[i].split(":");
                if (parseInt(tdate[1]) < oldestTime) {
                    return true;
                } else {
                    return false;
                }
            }
        }
    } catch (e) {
        Log.error(e);
    }
    return false;

}

function isFsOverLimit() {
    try {
        var dudata = execSync("du -s " + config.tmpdir + "");
        var dirsize = dudata.toString().replace("\n", "").split(/(\s|\t)/g);
        prommetrics.gset('drumgen_items_cache_size', parseInt(dirsize[0]), {
            "appid": prommetrics.appid
        });
        if (dirsize[0] > config.tmpSizeLimit) {
            return true;
        }
    } catch (e) {
        Log.error(e);
        Log.debug("Could not determine folder size");
        return false;
    }
    return false;
}

function deleteFiles(filelist, filenamepre) {
    for (var f in filelist) {
        if ((config.tmpdir + filelist[f]).indexOf(filenamepre) === 0) {
            Log.debug("" + filelist[f] + " matches naming for " + filenamepre + " and will be deleted");
            fs.unlink(config.tmpdir + filelist[f], function(err) {
                if (err) {
                    Log.error(err);
                }
            });
        }
    }
}

function doCleanupDirSize() {
    if (isFsOverLimit()) {
        Log.debug("FS over limit, doing extreme clean");
        var oldtime = config.tmpMaxAge;
        config.tmpMaxAge = config.tmpSizeOverMaxAge;
        doCleanupNormal();
        config.tmpMaxAge = oldtime;
    } else {
        Log.debug("Directory size was still under configured limit, skipping extreme clean");
    }
}

function doCleanupNormal() {
    try {
        fs.readdir(config.tmpdir, function(err, files) {
            files.forEach(function(file) {
                if (file.indexOf(".ly") > 1) {
                    var fullname = config.tmpdir + file;
                    if (shouldDeleteFile(fullname)) {
                        Log.info("Deleting file " + fullname + " which is older than maxage");
                        var filenoext = fullname.substr(0, fullname.indexOf(".ly"));
                        deleteFiles(files, filenoext);
                    }
                }
            });
        });
    } catch (e) {
        Log.error(e);
    }
}

function reportCachedItems() {
    var pngs = 0;
    var lys = 0;
    var midis = 0;
    var oggs = 0;
    var wavs = 0;
    var scanned = 0;

    try {
        fs.readdir(config.tmpdir, function(err, files) {
            var totalFiles = files.length;
            files.forEach(function(file) {
                scanned += 1;
                if (file.indexOf(".ly") > 1) {
                    lys += 1;
                }
                if (file.indexOf(".png") > 1) {
                    pngs += 1;
                }
                if (file.indexOf(".midi") > 1) {
                    midis += 1;
                }
                if (file.indexOf(".ogg") > 1) {
                    oggs += 1;
                }
                if (file.indexOf(".wav") > 1) {
                    wavs += 1;
                }
                if (scanned === totalFiles) {
                    prommetrics.gset("drumgen_items_in_cache", pngs, {
                        "type": "png",
                        "appid": prommetrics.appid
                    });
                    prommetrics.gset("drumgen_items_in_cache", oggs, {
                        "type": "ogg",
                        "appid": prommetrics.appid
                    });
                    prommetrics.gset("drumgen_items_in_cache", midis, {
                        "type": "midi",
                        "appid": prommetrics.appid
                    });
                    prommetrics.gset("drumgen_items_in_cache", lys, {
                        "type": "ly",
                        "appid": prommetrics.appid
                    });
                    prommetrics.gset("drumgen_items_in_cache", wavs, {
                        "type": "wav",
                        "appid": prommetrics.appid
                    });
                }
            });
        });
        isFsOverLimit();
    } catch (e) {
        Log.error(e);
    }
}

reportInterval = setInterval(reportCachedItems, 30000);

function stopReport() {
    clearInterval(reportInterval);
}

function startCleanup(cb) {
    intervalCallbacks.push(cb);
    if (cleanInterval) {
        Log.debug("Interval already started, ignoring new call");
        return false;
    }
    cleanInterval = setInterval(function() {

        doCleanupNormal();
        doCleanupDirSize();

        for (var acb in intervalCallbacks) {
            if (intervalCallbacks[acb] && typeof intervalCallbacks[acb] === 'function') {
                intervalCallbacks[acb]();
            }
        }
    }, config.tmpCleanupInterval);

}

function stopCleanup() {
    clearInterval(cleanInterval);
    intervalCallbacks = [];
    cleanInterval = null;
}

module.exports = {
    start: startCleanup,
    stop: stopCleanup,
    stopReporting: stopReport
};
