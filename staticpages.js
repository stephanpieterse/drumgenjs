/* jshint strict: false */
/* global module */
var fs = require('fs');
var config = require('./config.js');
var util = require('./util.js');
var Log = require('./logger.js');
var common = require('./commonblockfuncs.js');

//var pageHost = config.server.fullhost;
var pageHost = "";
var nl = "\n";

// the streaming is needed in the first place because:
// we can precalc the entire page and just serve it,
// but it is a very static page, and there are images
// on there which may be unrendered server side and
// may take a few (60) seconds to generate all of them
// the browser doesn't render ANYTHING up until that point
// which is very bad UX.
// if we stream the tags, the browser actually renders the
// page, and images pop up as they get rendered, which
// is a much smoother experience

var parseOpts = function(opts) {
    var pageLinkAdd = "";
    var mappings = ['r', 'R', 'l', 'L'];

    if (opts.toggles.kick === true) {
        opts.kick = !opts.kick;
    }
    if (opts.kick === true) {
        mappings = mappings.concat(['g', 'G']);
        pageLinkAdd += "&kick=true";
    } else {
        pageLinkAdd += "&kick=false";
    }
    if (opts.toggles.sticking === true) {
        opts.nosticking = !opts.nosticking;
    }
    if (opts.nosticking !== false) {
        mappings = ['x', 'X'];
        pageLinkAdd += "&nosticking=true";
    } else {
        pageLinkAdd += "&nosticking=false";
    }
    if (opts.blanks) {
        mappings = mappings.concat(['x', 'X']);
        pageLinkAdd += "&blanks=true";
    }
    if (opts.toggles.rests === true) {
        opts.rests = !opts.rests;
    }
    if (opts.rests === true) {
        mappings.push("-");
        pageLinkAdd += "&rests=true";
    } else {
        pageLinkAdd += "&rests=false";
    }
    opts.pageLinkAdd = pageLinkAdd;
    opts.mappings = mappings;
    return opts;
};

var getAll8StreamContin = function(stream, opts, filter) {

    if (!filter) {
        filter = function() {
            return true;
        };
    }

    var patlen = opts.patlen;
    var pagenum = opts.pagenum;
    var frompage = opts.frompage;
    var maxpatlen = 8 + 1;
    pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
    pagenum = Math.abs(pagenum);
    patlen = isNaN(patlen) ? 4 : patlen;
    patlen = Math.abs(patlen % maxpatlen);

    var pagebody = fs.readFileSync('static/permutationsheet_filter.html', 'utf8');
    opts = parseOpts(opts);

    var pattern = [];
    var sipattern = [];
    pattern[0] = common.makeCleanBlock(8);
    sipattern[0] = common.makeCleanBlock(8);

    var notetypes = opts.mappings.length;

    var pagePath = "/worksheetfilter/";

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    var patLenLinks = "";
    for (var i = 2; i < maxpatlen; i++) {
        patLenLinks += '<a href="' + pagePath + i + '"> ' + i + ' </a>';
    }
    var prevPageLink = pageHost + pagePath + patlen + "?page=" + frompage;
    var footerData = "Patterns from " + pagenum;

    var toggleStickingLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglesticking=true";
    toggleStickingLink = '<a class="toggle-sticking" href="' + toggleStickingLink + '">Toggle Sticking</a>';
    var toggleRestsLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglerests=true";
    toggleRestsLink = '<a class="toggle-rests" href="' + toggleRestsLink + '">Toggle Rests</a>';
    var toggleKickLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglekick=true";
    toggleKickLink = '<a class="toggle-kick" href="' + toggleKickLink + '">Toggle Kick</a>';

    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink + " " + toggleKickLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);

    stream.push(pageStart);
    var written = pagenum;
    var onPage = 0;
    var maxPatterns = Math.pow(notetypes, patlen);

    Log.trace('Start of intervalled stream');
    var bufferWriteInterval = setInterval(function() {
        if (written < maxPatterns && onPage < opts.itemsPerPage) {

            var isPatInt = false;
            var mx;
            var cpat;
            while (isPatInt === false && written <= maxPatterns) {
                mx = written;
                cpat = (mx).toString(notetypes);
                cpat = util.lpad(cpat, patlen);
                pattern[mx] = cpat.split("");
                for (var px in pattern[mx]) {
                    pattern[mx][px] = opts.mappings[pattern[mx][px]];
                }
                sipattern[0] = pattern[mx];
                isPatInt = filter(sipattern);
                written += 1;
            }
            // catch for 2nd condition loop exit
            if (isPatInt === true) {
                onPage += 1;
                var writable = "<div><img src='" + pageHost + "/public/image?noname=true&nometro=true&patref=" + common.exportBlocks(sipattern) + "' alt='Pattern " + common.exportBlocks(sipattern) + "' /></div>" + nl;
                stream.push(writable);
            }
        } else {
            Log.trace('End of intervalled stream');
            if (written + 1 > maxPatterns) {
                written = 1;
            }
            var nextPageLink = pageHost + pagePath + patlen + "?frompage=" + pagenum + "&page=" + (written + 1) + opts.pageLinkAdd;
            pageEnd = pageEnd.replace("{{PREVPAGE}}", prevPageLink);
            pageEnd = pageEnd.replace("{{NEXTPAGE}}", nextPageLink);
            pageEnd = pageEnd.replace("{{PAGENUM}}", footerData);
            stream.push(pageEnd);
            stream.push(null);
            clearInterval(bufferWriteInterval);
        }
    }, 100);
};

var getAll8StreamContinMap = function(stream, opts, filter) {

    if (!filter) {
        filter = function() {
            return true;
        };
    }

    var patlen = opts.patlen;
    var pagenum = opts.pagenum;
    var maxpatlen = 8 + 1;
    pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
    pagenum = Math.abs(pagenum);
    patlen = isNaN(patlen) ? 4 : patlen;
    patlen = Math.abs(patlen % maxpatlen);

    var pagebody = fs.readFileSync('static/permutationsheet_filter_map.html', 'utf8');
    opts = parseOpts(opts);

    var pattern = [];
    var sipattern = [];
    pattern[0] = common.makeCleanBlock(8);
    sipattern[0] = common.makeCleanBlock(8);

    var notetypes = opts.mappings.length;

    var pagePath = "/worksheetmap/";
    var sheetPath = "/worksheetfilter/";

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    var patLenLinks = "";
    for (var i = 2; i < maxpatlen; i++) {
        patLenLinks += '<a href="' + pagePath + i + '"> ' + i + ' </a>';
    }

    var toggleStickingLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglesticking=true";
    toggleStickingLink = '<a class="toggle-sticking" href="' + toggleStickingLink + '">Toggle Sticking</a>';
    var toggleRestsLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglerests=true";
    toggleRestsLink = '<a class="toggle-rests" href="' + toggleRestsLink + '">Toggle Rests</a>';
    var toggleKickLink = pageHost + pagePath + patlen + "?page=1" + opts.pageLinkAdd + "&togglekick=true";
    toggleKickLink = '<a class="toggle-kick" href="' + toggleKickLink + '">Toggle Kick</a>';

    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink + " " + toggleKickLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);

    stream.push(pageStart);
    var written = 1;
    var maxPatterns = Math.pow(notetypes, patlen);

    var bufferWriteInterval = setInterval(function() {
        if (written < maxPatterns) {
            var isPatInt = false;
            var mx;
            var cpat;
            var patsOnPage = 0;
            var writable = '<br/><a href="' + pageHost + sheetPath + patlen + '?page=' + written + opts.pageLinkAdd + '">From ' + written + '</a>';
            stream.push(writable);

            while (patsOnPage < opts.itemsPerPage) {
                isPatInt = false;
                while (isPatInt === false && written <= maxPatterns) {
                    mx = written;
                    cpat = (mx).toString(notetypes);
                    cpat = util.lpad(cpat, patlen);
                    pattern[mx] = cpat.split("");
                    for (var px in pattern[mx]) {
                        pattern[mx][px] = opts.mappings[pattern[mx][px]];
                    }
                    sipattern[0] = pattern[mx];
                    isPatInt = filter(sipattern);
                    written += 1;
                }
                patsOnPage += 1;
            }

        } else {
            Log.trace('End of intervalled stream');
            if (written + 1 > maxPatterns) {
                written = 1;
            }
            pageEnd = pageEnd.replace("{{PAGENUM}}", "");
            stream.push(pageEnd);
            stream.push(null);
            clearInterval(bufferWriteInterval);
        }
    }, 100);
};

module.exports = {
    getAll8StreamFilter: getAll8StreamContin,
    getAll8StreamFilterMap: getAll8StreamContinMap
};
