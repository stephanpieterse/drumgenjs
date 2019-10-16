/*jshint strict:false */
/* global require, module */
var prommetrics = require('./prommetrics.js');

prommetrics.createCounter('http_requests_total', "Stats for http requests", ["path", "status_code", "appid"]);
prommetrics.createGauge('drumgen_items_in_cache', "Total cached items available", ["type", "appid"]);
prommetrics.createGauge('drumgen_items_cache_size', "Total disk usage of cached items", ["appid"]);
prommetrics.createHistogram('http_requests_timings', "Timings for http requests", ["path", "appid"], [50, 100, 250, 500, 1000, 2500, 5000]);
prommetrics.createHistogram('analytics_user_pagetime', "How long the page was open for", ["path", "appid"], [5000, 30000, 120000, 300000]);
prommetrics.createHistogram('analytics_user_timehidden', "How long the page was hidden in some form", ["path", "appid"], [5000, 30000, 120000, 300000]);
prommetrics.createHistogram('analytics_user_timevisible', "How long the page was visible in some form", ["path", "appid"], [5000, 30000, 120000, 300000]);
prommetrics.createHistogram('analytics_server_generationtime', "Server side timing stats", ["section", "appid"], [50, 100, 250, 500, 1000, 2500]);

module.exports = {};
