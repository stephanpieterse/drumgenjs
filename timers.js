/* global process */
/* jshint strict:false */

var timers = {};

function timer(name) {
    timers[name + '_start'] = process.hrtime();
}

function timerEnd(name) {
    if (!timers[name + '_start']) return undefined;
    var realtime = process.hrtime(timers[name + '_start']);
    var ts = realtime[0] * 1000;
    var tms = realtime[1] / 1000000;
    var time = ts + tms;
    var amount = timers[name + '_amount'] = timers[name + '_amount'] ? timers[name + '_amount'] + 1 : 1;
    //var sum = timers[name + '_sum'] = timers[name + '_sum'] ? timers[name + '_sum'] + time : time;
    timers[name + '_avg'] = ((timers[name + '_avg'] || 0) + time) / 2;
    delete timers[name + '_start'];
    return time;
}

module.exports = {
    timers: timers,
    start: timer,
    end: timerEnd
};
