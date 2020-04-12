/* jshint strict: false */
/* global setInterval, Hammer */

window._ns_drumgen = {};
var thisInst = window._ns_drumgen;

function doHealthCheck() {
    $.get("/health?_=" + cseed).done(function() {
        $('.healthpanel').hide();
				thisInst.health = "UP";
    }).catch(function() {
        $('.healthpanel').show();
				thisInst.health = "DOWN";
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
var state = {};

thisInst.dbtimers = {};

var seedcount = 0;
var cseed = "public";

function debounce(func, delay){
	var fname = func.name;
	clearTimeout(thisInst.dbtimers[fname]);
	thisInst.dbtimers[fname] = setTimeout(func, delay);
}

funcs.getSeed = function() {
    // new postfix every 10s
    var inst = parseInt(new Date().getTime() / 1000 / 10);
    // mod against 4, so 4 patterns every x seconds per user?
    // we double the increment and the mod because of
    //  how the backend increments totps
    seedcount = (seedcount + 2) % 8;
    cseed = "" + getId() + seedcount + inst;
};


var LS = {
    get: function(a) {
        try {
          return JSON.parse(window.localStorage.getItem(a));
        } catch (e){
					return undefined;
				}
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

funcs.getSeed();

var hosturl = '';
var patternbaseurl = hosturl + '/public/pattern?app=true';
var audiobaseurl = hosturl + '/public/audio?app=true'; //asbase64=false';
var paturlext = '&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}';
var hburlext = '&patref={{PATREF}}&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}';
var editpatext = hosturl + '/static/custompat.html?patref={{PATREF}}';
var audiorefreshurl = hosturl + '/public/refresh/audio?app=true'; //asbase64=false';
var imagebaseurl = hosturl + '/public/image?app=true'; //asbase64=false';

settings.pattern_length = 4;
settings.pattern_type = 'accent';
settings.pattern_limbs = 4;
settings.pattern_tuples = [2, 3, 4];
settings.pattern_ref = "s5c5c4c4c4cbb6e";
settings.metronome_on = true;
settings.rests_on = true;
settings.nested_tuples = false;
settings.loop_audio = true;
settings.tempo = 100;


var setupSettings = function() {
    var s = LS.get("app-settings");
    if (s) {
        settings = s;
    }

    $('[name="barlength"]').val(settings.pattern_length);
    $('[name="tempo"]').val(settings.tempo);

    $('[name="rests_on"]').removeAttr('checked');
    if(settings.rests_on){
      $('[name="rests_on"]').attr('checked', 'checked');
    } 

   $('[name^="etuple"]').removeAttr('checked');
   for (var pt in settings.pattern_tuples){
      $('[name="etuple' + settings.pattern_tuples[pt] + '"]').attr('checked', 'checked');
   }

};

setupSettings();

// trying to count unique instances
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
var audiobtnholder = $('.audioplaybtn');

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

    imgholder.hide();
    mainsndholder.hide();
    audiobtnholder.hide();
    loader.show();

    var paturl = buildTemplateUrl(patternbaseurl + paturlext);
    $.get(paturl).then(function(data) {

        settings.pattern_ref = data.patref;

				if(LS.get("globpatref")){
					settings.pattern_ref = LS.get("globpatref");
					LS.set("globpatref", undefined);
				}

        //var newimg = imagebaseurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nested=' + settings.nested_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;
        var newimg = buildTemplateUrl(imagebaseurl + hburlext);

        var newsnd = buildTemplateUrl(audiobaseurl + hburlext);
        //   var newsnd = audiobaseurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nested=' + settings.nested_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;

        imgholder.on("load", function() {
            loader.hide();
            imgholder.show();
            mainsndholder.show();
            audiobtnholder.show();
        });

        imgholder.attr("src", newimg);
        sndholder.attr("src", newsnd);
        $('.editbtn').attr("href", buildTemplateUrl(editpatext));

    }).catch(function(e) {
        console.log("whoopseedoodle");
        console.log(e);
        doHealthCheck();
        loader.hide();
        imgholder.show();
        mainsndholder.show();
        audiobtnholder.show();
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
  LS.set("app-settings", settings);
  if(state.playing){
    $('.audioplaybtn').click();
  }
  init();
}

function callToRefresh() {

    LS.set("app-settings", settings);

    if(state.playing){
	$('.audioplaybtn').click();
    }

    funcs.getSeed();
    loader.show();
    mainsndholder.hide();
    audiobtnholder.hide();
    //var newsnd = audiorefreshurl + '&seed=' + cseed + '&patlen=' + settings.pattern_length + '&tuples=' + settings.pattern_tuples + '&nometro=' + !settings.metronome_on + '&tempo=' + settings.tempo;
    var newsnd = buildTemplateUrl(audiorefreshurl + hburlext);

    sndholder.attr("src", newsnd);
    sndholder.on("canplay", function() {
        mainsndholder.show();
        audiobtnholder.show();
        loader.hide();
    });

}

var bl = $('[name="barlength"]');
bl.change(function() {
    var blval = bl.val() < 2 ? 2 : (bl.val() > 16 ? 16 : bl.val());
    bl.val(blval);
    settings.pattern_length = blval;

    callToChange();

});

var temposel = $('[name="tempo"]');
temposel.change(function() {
    var temposelval = temposel.val() < 34 ? 34 : (temposel.val() > 320 ? 320 : temposel.val());
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

$('[name="metronome_on"]').change(function() {
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

function incPlus(field){
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = isNaN(curval) ? 0 : curval + 1;
    $('input[name=' + field + ']').val(newval);
	debounce(function inc(){
      $('input[name=' + field + ']').change();
	}, 200);
}

function decMin(field){
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = isNaN(curval) ? 0 : curval - 1;
    $('input[name=' + field + ']').val(newval);
	debounce(function dec(){
      $('input[name=' + field + ']').change();
	}, 200);

}
var timeoutId = 0;

$('.plusbtn').on('mousedown touchstart', function(ev) {
    ev.preventDefault();
    obj = $(this).attr('field');
    timeoutId = setInterval(function(){incPlus(obj)}, 120);
    incPlus(obj);
}).on('mouseup mouseleave touchend', function() {
    clearInterval(timeoutId);
});

$('.minusbtn').on('mousedown touchstart', function(ev) {
    ev.preventDefault();
    obj = $(this).attr('field');
    timeoutId = setInterval(function(){decMin(obj)}, 120);
    decMin(obj);
}).on('mouseup mouseleave touchend', function() {
    clearInterval(timeoutId);
});

$('.audioplaybtn').on('click', function(){
  if (state.playing){
    $('.audiosrc').get(0).pause();
    $('.audiosrc').get(0).currentTime = 0;
    $('.audiosrc').get(0).pause();
    $('.audioplaybtn .playimg').show();
    $('.audioplaybtn .stopimg').hide();
  }else{
    $('.audiosrc').get(0).play();
    $('.audioplaybtn .stopimg').show();
    $('.audioplaybtn .playimg').hide();
  }
  state.playing = !state.playing;
});
