/* jshint strict:false */
/* global require, module, setInterval, clearInterval */

var config = require("./config.js");
var fs = require('fs');
var Log = require('./logger.js');

var cleanInterval;

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

function startCleanup(cb) {
    intervalCallbacks.push(cb);
    if (cleanInterval) {
        Log.debug("Interval already started, ignoring new call");
        return false;
    }
    cleanInterval = setInterval(function() {

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
};
