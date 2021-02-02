/* jshint strict: false */
/* global module */
var fs = require('fs');
var config = require('./config.js');
var util = require('./util.js');
var Log = require('./logger.js');
var common = require('./commonblockfuncs.js');

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
//var getAll8StreamPaged = function(stream, opts) {
//
//    var patlen = opts.patlen;
//    var pagenum = opts.pagenum;
//    var maxpatlen = 16 + 1;
//    pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
//    pagenum = Math.abs(pagenum);
//    patlen = isNaN(patlen) ? 4 : patlen;
//    patlen = Math.abs(patlen % maxpatlen);
//    var barlen = patlen;
//
//    var pagebody = fs.readFileSync('static/permutationsheet.html', 'utf8');
//    var pageLinkAdd = "";
//    var mappings = ['r', 'R', 'l', 'L'];
//    if (opts.toggles.sticking === true) {
//        opts.nosticking = !opts.nosticking;
//    }
//    if (opts.nosticking !== false) {
//        mappings = ['x', 'X'];
//        pageLinkAdd += "&nosticking=true";
//    } else {
//        pageLinkAdd += "&nosticking=false";
//    }
//    if (opts.blanks) {
//        mappings = mappings.concat(['x', 'X']);
//        pageLinkAdd += "&blanks=true";
//    }
//    if (opts.toggles.rests === true) {
//        opts.rests = !opts.rests;
//    }
//    if (opts.rests === true) {
//        mappings.push("-");
//        pageLinkAdd += "&rests=true";
//    } else {
//        pageLinkAdd += "&rests=false";
//    }
//
//    var pattern = [];
//    var sipattern = [];
//    pattern[0] = common.makeCleanBlock(8);
//    sipattern[0] = common.makeCleanBlock(8);
//
//    var notetypes = mappings.length;
//    var maxPatterns = Math.pow(notetypes, barlen);
//    var maxPages = Math.ceil(Math.pow(notetypes, barlen) / config.worksheet.pageItems);
//    if (pagenum > maxPages) {
//        pagenum = 1;
//    }
//    var mxpat = pagenum * config.worksheet.pageItems;
//    if (mxpat > maxPatterns) {
//        mxpat = maxPatterns;
//    }
//
//    var randomPageNum = Math.round((Math.random() * maxPages) + 1);
//
//    //var pageHost = config.server.fullhost;
//    var pageHost = "";
//    var pagePath = "/worksheet/";
//
//    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
//    var pageStart = pageSplits[0];
//    var pageEnd = pageSplits[1];
//
//    var patLenLinks = "";
//    for (var i = 2; i < maxpatlen; i++) {
//        patLenLinks += '<a href="' + pagePath + i + '"> ' + i + ' </a>';
//    }
//    var prevPageLink = pageHost + pagePath + patlen + "?page=" + ((pagenum - 1) > 0 ? pagenum - 1 : 1) + pageLinkAdd;
//    var nextPageLink = pageHost + pagePath + patlen + "?page=" + (pagenum + 1) + pageLinkAdd;
//    var randomPageLink = pageHost + pagePath + patlen + "?page=" + randomPageNum + pageLinkAdd;
//    var footerData = "Page " + pagenum + " of " + maxPages;
//
//    var toggleStickingLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglesticking=true";
//    toggleStickingLink = '<a href="' + toggleStickingLink + '">Toggle Sticking</a>';
//    var toggleRestsLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglerests=true";
//    toggleRestsLink = '<a href="' + toggleRestsLink + '">Toggle Rests</a>';
//
//    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink);
//
//    pageStart = pageStart.replace("{{PREVPAGE}}", prevPageLink);
//    pageStart = pageStart.replace("{{NEXTPAGE}}", nextPageLink);
//    pageStart = pageStart.replace("{{RANDOMPAGE}}", randomPageLink);
//    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);
//    pageEnd = pageEnd.replace("{{PAGENUM}}", footerData);
//
//    stream.push(pageStart);
//    var written = (pagenum - 1) * config.worksheet.pageItems;
//
//    Log.debug('Start of intervalled stream');
//    var bufferWriteInterval = setInterval(function() {
//        if (written < mxpat) {
//            var mx = written;
//            var cpat = (mx).toString(notetypes);
//            cpat = util.lpad(cpat, barlen);
//            pattern[mx] = cpat.split("");
//            for (var px in pattern[mx]) {
//                pattern[mx][px] = mappings[pattern[mx][px]];
//            }
//            sipattern[0] = pattern[mx];
//            var writable = "<div><img src='" + pageHost + "/public/image?noname=true&nometro=true&patref=" + common.exportBlocks(sipattern) + "' alt='Pattern " + common.exportBlocks(sipattern) + "' /></div>" + nl;
//            stream.push(writable);
//            written += 1;
//        } else {
//            Log.debug('End of intervalled stream');
//            stream.push(pageEnd);
//            stream.push(null);
//            clearInterval(bufferWriteInterval);
//        }
//    }, 100);
//};

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
    var barlen = patlen;

    var pagebody = fs.readFileSync('static/permutationsheet_filter.html', 'utf8');
    var pageLinkAdd = "";
    var mappings = ['r', 'R', 'l', 'L'];

    if (opts.toggles.kick === true) {
        opts.kick = !opts.kick;
    }
    if (opts.kick === true) {
        mappings =  mappings.concat(['g', 'G']);
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

    var pattern = [];
    var sipattern = [];
    pattern[0] = common.makeCleanBlock(8);
    sipattern[0] = common.makeCleanBlock(8);

    var notetypes = mappings.length;

    var pageHost = "";
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

    var toggleStickingLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglesticking=true";
    toggleStickingLink = '<a href="' + toggleStickingLink + '">Toggle Sticking</a>';
    var toggleRestsLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglerests=true";
    toggleRestsLink = '<a href="' + toggleRestsLink + '">Toggle Rests</a>';
    var toggleKickLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglekick=true";
    toggleKickLink = '<a href="' + toggleKickLink + '">Toggle Kick</a>';

    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink + " " + toggleKickLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);

    stream.push(pageStart);
    var written = pagenum;
    var mxpat = config.worksheet.pageItems;
    var onPage = 0;
    var maxPatterns = Math.pow(notetypes, barlen);

    Log.debug('Start of intervalled stream');
    var bufferWriteInterval = setInterval(function() {
        if (written < maxPatterns && onPage < mxpat) {

            var isPatInt = false;
            var mx;
            var cpat;
            while (isPatInt === false && written <= maxPatterns) {
                mx = written;
                cpat = (mx).toString(notetypes);
                cpat = util.lpad(cpat, barlen);
                pattern[mx] = cpat.split("");
                for (var px in pattern[mx]) {
                    pattern[mx][px] = mappings[pattern[mx][px]];
                }
                sipattern[0] = pattern[mx];
                isPatInt = filter(sipattern);
                written += 1;
            }
						// catch for 2nd condition loop exit
            if(isPatInt === true){
                onPage += 1;
                var writable = "<div><img src='" + pageHost + "/public/image?noname=true&nometro=true&patref=" + common.exportBlocks(sipattern) + "' alt='Pattern " + common.exportBlocks(sipattern) + "' /></div>" + nl;
                stream.push(writable);
            }
        } else {
            Log.debug('End of intervalled stream');
            if(written + 1 > maxPatterns){
              written = 1;
            }
            var nextPageLink = pageHost + pagePath + patlen + "?frompage=" + pagenum + "&page=" + (written + 1) + pageLinkAdd;
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
    var barlen = patlen;

    var pagebody = fs.readFileSync('static/permutationsheet_filter_map.html', 'utf8');
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

    var pattern = [];
    var sipattern = [];
    pattern[0] = common.makeCleanBlock(8);
    sipattern[0] = common.makeCleanBlock(8);

    var notetypes = mappings.length;

    var pageHost = "";
    var pagePath = "/worksheetmap/";
    var sheetPath = "/worksheetfilter/";

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    var patLenLinks = "";
    for (var i = 2; i < maxpatlen; i++) {
        patLenLinks += '<a href="' + pagePath + i + '"> ' + i + ' </a>';
    }

    var toggleStickingLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglesticking=true";
    toggleStickingLink = '<a href="' + toggleStickingLink + '">Toggle Sticking</a>';
    var toggleRestsLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglerests=true";
    toggleRestsLink = '<a href="' + toggleRestsLink + '">Toggle Rests</a>';
    var toggleKickLink = pageHost + pagePath + patlen + "?page=1" + pageLinkAdd + "&togglekick=true";
    toggleKickLink = '<a href="' + toggleKickLink + '">Toggle Kick</a>';

    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink + " " + toggleKickLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);

    stream.push(pageStart);
    var written = 1;
    var mxpat = config.worksheet.pageItems;
    var maxPatterns = Math.pow(notetypes, barlen);

    var bufferWriteInterval = setInterval(function() {
        if (written < maxPatterns) {
            var isPatInt = false;
            var mx;
            var cpat;
            var patsOnPage = 0;
            var writable = '<br/><a href="' + pageHost + sheetPath + patlen + '?page=' + written + pageLinkAdd + '">From ' + written + '</a>';
            stream.push(writable);

            while(patsOnPage < mxpat){
              isPatInt = false;
              while (isPatInt === false && written <= maxPatterns) {
                mx = written;
                cpat = (mx).toString(notetypes);
                cpat = util.lpad(cpat, barlen);
                pattern[mx] = cpat.split("");
                for (var px in pattern[mx]) {
                    pattern[mx][px] = mappings[pattern[mx][px]];
                }
                sipattern[0] = pattern[mx];
                isPatInt = filter(sipattern);
                written += 1;
              }
              patsOnPage += 1;
            }

        } else {
            Log.debug('End of intervalled stream');
            if(written + 1 > maxPatterns){
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
  //  getAll8Stream: getAll8StreamPaged,
    getAll8StreamFilter: getAll8StreamContin,
    getAll8StreamFilterMap: getAll8StreamContinMap
};
