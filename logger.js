/* jshint strict: false */
/* global require, process, module */
var bunyan = require('bunyan');
var log_level = process.env["LOG_LEVEL"] || "info";
module.exports = new bunyan({
    name: "drumgen",
    level: log_level,
    src: true
});
