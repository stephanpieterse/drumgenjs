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
var getAll8Stream = function(stream, opts) {

    var patlen = opts.patlen;
    var pagenum = opts.pagenum;
    var maxpatlen = 16 + 1;
    pagenum = isNaN(parseInt(pagenum)) ? 1 : parseInt(pagenum);
    pagenum = Math.abs(pagenum);
    patlen = isNaN(patlen) ? 4 : patlen;
    patlen = Math.abs(patlen % maxpatlen);
    var barlen = patlen;

    var pagebody = fs.readFileSync('static/permutationsheet.html', 'utf8');
    var pageLinkAdd = "";
    var mappings = ['r', 'R', 'l', 'L'];
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
    var maxPatterns = Math.pow(notetypes, barlen);
    var maxPages = Math.ceil(Math.pow(notetypes, barlen) / config.worksheet.pageItems);
    if (pagenum > maxPages) {
        pagenum = 1;
    }
    var mxpat = pagenum * config.worksheet.pageItems;
    if (mxpat > maxPatterns) {
        mxpat = maxPatterns;
    }

    var randomPageNum = Math.round((Math.random() * maxPages) + 1);

    //var pageHost = config.server.fullhost;
    var pageHost = "";

    var pageSplits = pagebody.split("{{MAINHOLDER_DATA}}");
    var pageStart = pageSplits[0];
    var pageEnd = pageSplits[1];

    var patLenLinks = "";
    for (var i = 2; i < maxpatlen; i++) {
        patLenLinks += '<a href="/worksheet/' + i + '"> ' + i + ' </a>';
    }
    var prevPageLink = pageHost + "/worksheet/" + patlen + "?page=" + ((pagenum - 1) > 0 ? pagenum - 1 : 1) + pageLinkAdd;
    var nextPageLink = pageHost + "/worksheet/" + patlen + "?page=" + (pagenum + 1) + pageLinkAdd;
    var randomPageLink = pageHost + "/worksheet/" + patlen + "?page=" + randomPageNum + pageLinkAdd;
    var footerData = "Page " + pagenum + " of " + maxPages;

    var toggleStickingLink = pageHost + "/worksheet/" + patlen + "?page=1" + pageLinkAdd + "&togglesticking=true";
    toggleStickingLink = '<a href="' + toggleStickingLink + '">Toggle Sticking</a>';
    var toggleRestsLink = pageHost + "/worksheet/" + patlen + "?page=1" + pageLinkAdd + "&togglerests=true";
    toggleRestsLink = '<a href="' + toggleRestsLink + '">Toggle Rests</a>';

    pageStart = pageStart.replace("{{TOGGLELINKS}}", toggleStickingLink + " " + toggleRestsLink);

    pageStart = pageStart.replace("{{PREVPAGE}}", prevPageLink);
    pageStart = pageStart.replace("{{NEXTPAGE}}", nextPageLink);
    pageStart = pageStart.replace("{{RANDOMPAGE}}", randomPageLink);
    pageStart = pageStart.replace("{{PATLENLINKS}}", patLenLinks);
    pageEnd = pageEnd.replace("{{PAGENUM}}", footerData);

    stream.push(pageStart);
    var written = (pagenum - 1) * config.worksheet.pageItems;

    Log.debug('Start of intervalled stream');
    var bufferWriteInterval = setInterval(function() {
        if (written < mxpat) {
            var mx = written;
            var cpat = (mx).toString(notetypes);
            cpat = util.lpad(cpat, barlen);
            pattern[mx] = cpat.split("");
            for (var px in pattern[mx]) {
                pattern[mx][px] = mappings[pattern[mx][px]];
            }
            sipattern[0] = pattern[mx];
            var writable = "<div><img src='" + pageHost + "/public/image?noname=true&nometro=true&patref=" + common.exportBlocks(sipattern) + "' alt='Pattern " + common.exportBlocks(sipattern) + "' /></div>" + nl;
            stream.push(writable);
            written += 1;
        } else {
            Log.debug('End of intervalled stream');
            stream.push(pageEnd);
            stream.push(null);
            clearInterval(bufferWriteInterval);
        }
    }, 75);
};

module.exports = {
    getAll8Stream: getAll8Stream
};
