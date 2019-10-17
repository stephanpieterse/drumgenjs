/* global process, require, module */
/* jshint strict:false */

var prommetrics = require('./prommetrics.js');

var timers = {};

function timer(name) {
    timers[name + '_start'] = process.hrtime();
}

function timerEnd(name) {
    if (!timers[name + '_start']) {
        return undefined;
    }
    var realtime = process.hrtime(timers[name + '_start']);
    var ts = realtime[0] * 1000;
    var tms = realtime[1] / 1000000;
    var time = ts + tms;
    timers[name + '_avg'] = ((timers[name + '_avg'] || 0) + time) / 2;
    delete timers[name + '_start'];

    prommetrics.hobs('analytics_server_generationtime', time, {
        "section": name,
        "appid": prommetrics.appid
    });

    return time;
}

module.exports = {
    timers: timers,
    start: timer,
    end: timerEnd
};
