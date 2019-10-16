/* jshint strict: false */
/* global setInterval, Hammer */

window._ns_drumgen = {};

function doHealthCheck() {
    $.get("/health?_=" + cseed).done(function() {
        $('.healthpanel').hide();
    }).catch(function() {
        $('.healthpanel').show();
    });
}

window._ns_drumgen.healthCheckInterval = setInterval(function() {
    doHealthCheck();
}, 1000 * 60);

$('.settings-image').click(function() {
    $('.settingspanel').toggle();
});

$('.reload-image').click(function() {
    callToChange();
});

var funcs = {};
var settings = {};

var seedcount = 0;
var cseed = "public";

funcs.getSeed = function() {
    // new postfix every 10s
    var inst = parseInt(new Date().getTime() / 1000 / 10);
    // mod against 4, so 4 patterns every x seconds per user?
    seedcount = (seedcount + 1) % 3;
    cseed = "x-" + seedcount + inst + "-dg-app";
};

funcs.getSeed();

var hosturl = '';
var patternbaseurl = hosturl + '/public/pattern?app=true';
var audiobaseurl = hosturl + '/public/audio?app=true'; //asbase64=false';
var paturlext = '&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}';
var hburlext = '&patref={{PATREF}}&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}';
var audiorefreshurl = hosturl + '/public/refresh/audio?app=true'; //asbase64=false';
var imagebaseurl = hosturl + '/public/image?app=true'; //asbase64=false';

settings.pattern_length = 4;
settings.pattern_type = 'accent';
settings.pattern_limbs = 4;
settings.pattern_tuples = [2, 3, 4];
settings.pattern_ref = "s5c5c4c4c4cbb6e";
settings.metronome_on = false;
settings.rests_on = true;
settings.nested_tuples = false;
settings.loop_audio = false;
settings.tempo = 100;

var LS = {
    get: function(a) {
        return JSON.parse(window.localStorage.getItem(a));
    },
    set: function(a, b) {
        window.localStorage.setItem(a, JSON.stringify(b));
    }
};

var getId = function() {
    var idheader = 'x-drumgen-id';
    var cid = LS.get(idheader);
    if (cid) {
        return cid;
    }
    var ncid = '_' + Math.random().toString(36).substr(2, 9);
    LS.set(idheader, ncid);
    return ncid;
};

var ID = getId();

$.ajaxSetup({
    headers: {
        "x-drumgen-id": ID
    }
});

var loader = $('.loader-image');
var imgholder = $('.pattern-image');
var sndholder = $('.audiosrc');
var mainsndholder = $('.mainsndholder');

loader.hide();

function buildTemplateUrl(base) {
    return base.replace("{{SEED}}", cseed)
        .replace("{{PATLEN}}", settings.pattern_length)
        .replace("{{TUPLES}}", settings.pattern_tuples)
        .replace("{{NESTED}}", settings.nested_tuples)
        .replace("{{NOMETRO}}", !settings.metronome_on)
        .replace("{{NORESTS}}", !settings.rests_on)
        .replace("{{TEMPO}}", settings.tempo)
        .replace("{{PATREF}}", settings.pattern_ref);
}

var init = function() {
    funcs.getSeed();

    loader.show();
    imgholder.hide();
    mainsndholder.hide();

    var paturl = buildTemplateUrl(patternbaseurl + paturlext);
    $.get(paturl).then(function(data) {

        settings.pattern_ref = data.patref;
        //var newimg = imagebaseurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nested=' + settings.nested_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;
        var newimg = buildTemplateUrl(imagebaseurl + hburlext);

        var newsnd = buildTemplateUrl(audiobaseurl + hburlext);
        //   var newsnd = audiobaseurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nested=' + settings.nested_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;

        imgholder.on("load", function() {
            loader.hide();
            imgholder.show();
            mainsndholder.show();
        });

        imgholder.attr("src", newimg);
        sndholder.attr("src", newsnd);

    }).catch(function(e) {
        console.log("whoopseedoodle");
        console.log(e);
        doHealthCheck();
        loader.hide();
        imgholder.show();
        mainsndholder.show();
    });

};

var hammerOptions = {};
var hammertime = new Hammer(imgholder[0], hammerOptions);
var hammerloadertime = new Hammer(loader[0], hammerOptions);

hammertime.on('swipe', function() {
    callToChange();
});

hammerloadertime.on('swipe', function() {
    callToChange();
});

init();

function callToChange() {
    init();
}

function callToRefresh() {

    funcs.getSeed();
    loader.show();
    mainsndholder.hide();
    //var newsnd = audiorefreshurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;
    var newsnd = buildTemplateUrl(audiorefreshurl + hburlext);

    sndholder.attr("src", newsnd);
    sndholder.on("canplay", function() {
        mainsndholder.show();
        loader.hide();
    });

}

var bl = $('[name="barlength"]');
bl.change(function() {
    var blval = bl.val() <= 0 ? 1 : bl.val() % 16;
    bl.val(blval);
    settings.pattern_length = blval;

    callToChange();

});

var temposel = $('[name="tempo"]');
temposel.change(function() {
    var temposelval = temposel.val() <= 0 ? 34 : temposel.val() % 320;
    temposel.val(temposelval);
    settings.tempo = temposelval;

    callToRefresh();

});

var gl = $('[name="groovelimbs"]');
gl.change(function() {
    var glval = gl.val() <= 0 ? 1 : gl.val() % 4;
    gl.val(glval);
    settings.pattern_limbs = glval;
    callToChange();
});

//$('[name="pattype"]').click(function() {
//    var type = $('[name="pattype"]:checked').val().toLowerCase();
//    settings.pattern_type = type;
//    console.log("pattype is " + type);
//});

$('[name^="etuple"]').click(function() {
    settings.pattern_tuples = [];
    $('[name^="etuple"]:checked').each(function() {
        settings.pattern_tuples.push($(this).val());
    });
    console.log("tuple set is " + settings.pattern_tuples);
    callToChange();
});

$('[name="rests_on"]').click(function() {
    settings.rests_on = ($('[name="rests_on"]:checked').val()) ? true : false;
    callToChange();
});

$('[name="metronome_on"]').click(function() {
    settings.metronome_on = ($('[name="metronome_on"]:checked').val()) ? true : false;
    callToRefresh();
});

$('[name="nested_tuples"]').click(function() {
    settings.nested_tuples = ($('[name="nested_tuples"]:checked').val()) ? true : false;
    callToChange();
});

$('[name="loop_audio"]').click(function() {
    settings.loop_audio = ($('[name="loop_audio"]:checked').val()) ? true : false;
    var sndholder = $('.audiosrc');
    if (settings.loop_audio) {
        sndholder.attr("loop", "true");
    } else {
        sndholder.removeAttr("loop");
    }
});

$('.plusbtn').click(function(ev) {
    ev.preventDefault();
    var field = $(this).attr('field');
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = isNaN(curval) ? 0 : curval + 1;
    $('input[name=' + field + ']').val(newval);
    $('input[name=' + field + ']').change();
});

$('.minusbtn').click(function(ev) {
    ev.preventDefault();
    var field = $(this).attr('field');
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = (isNaN(curval) || curval <= 0) ? 0 : curval - 1;
    $('input[name=' + field + ']').val(newval);
    $('input[name=' + field + ']').change();
});
