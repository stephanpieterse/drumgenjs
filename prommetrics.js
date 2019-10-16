/* jshint strict:false */
/* global module, require */

var promclient = require('prom-client');
promclient.collectDefaultMetrics({
    timestamps: false
});

var appId = "generic";

var gauges = [];
var counters = [];
var histograms = [];

function count_add(key, amnt, labels) {
    amnt = amnt || 1;
    if (!counters[key]) {
        return false;
    }
    counters[key].inc(labels, amnt);
    return true;
}

function gauge_set(key, amnt, labels) {
    gauges[key].set(labels, amnt);
    return true;
}

function create_gauge(key, help, labels) {
    if (!key || !help || !labels) {
        return false;
    }
    gauges[key] = new promclient.Gauge({
        name: key,
        help: key,
        labelNames: labels
    });
    return true;
}

function create_counter(key, help, labels) {
    if (!key || !help || !labels) {
        return false;
    }
    counters[key] = new promclient.Counter({
        name: key,
        help: help,
        labelNames: labels
    });
}

function create_histo(key, help, labels, buckets) {
    if (!key || !help || !labels || !buckets) {
        return false;
    }
    histograms[key] = new promclient.Histogram({
        name: key,
        help: help,
        labelNames: labels,
        buckets: buckets
    });
}

function histo_obs(key, amnt, labels) {
    if (amnt !== 0 && !amnt) {
        return false;
    }

    if (!histograms[key]) {
        return false;
    }
    histograms[key].observe(labels, amnt);
}

module.exports = {
    gset: gauge_set,
    cadd: count_add,
    hobs: histo_obs,
    createHistogram: create_histo,
    createCounter: create_counter,
    createGauge: create_gauge,
    appid: appId,
};
