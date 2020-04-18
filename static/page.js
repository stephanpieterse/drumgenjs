/* jshint strict: false */
/* global setInterval, Hammer */

window._ns_drumgen = {};
var thisInst = window._ns_drumgen;

thisInst.maxStarredPatterns = 15;
thisInst.maxHistory = 100;

function doHealthCheck() {
		funcs.getSeed();
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
}, 1000 * 45);

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
var paturlext = '&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}&map={{MAP}}';
var hburlext = '&patref={{PATREF}}&seed={{SEED}}&patlen={{PATLEN}}&tuples={{TUPLES}}&nested={{NESTED}}&nometro={{NOMETRO}}&tempo={{TEMPO}}&norests={{NORESTS}}&map={{MAP}}';
var editpatext = hosturl + '/static/custompat.html?patref={{PATREF}}';
var audiorefreshurl = hosturl + '/public/refresh/audio?app=true'; //asbase64=false';
var imagebaseurl = hosturl + '/public/image?app=true'; //asbase64=false';

var soundValuesMap = [{"map":"sn","text":"Snare"}, {"map":"ss","text":"Sidestick"}, {"map":"wbl","text":"Woodblock"}, {"map":"boh","text": "Bongo"}]

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
settings.sound_map_index = 0;
settings.sound_map_map = "sn";


var loadStarred = function(){
	var h = LS.get("starred-patterns");
	if (h){
		thisInst.starred = h;
	} else {
    thisInst.starred = [];
	}
}

var loadStarredPattern = function(patref){
	LS.set("globpatref", patref);
	callToChange();	
}

var addToStarred = function(){
	if(thisInst.starred.indexOf(settings.pattern_ref) != -1){
		return false;
	}

	thisInst.starred.unshift(settings.pattern_ref);
  while (thisInst.starred.length > thisInst.maxStarredPatterns){
		thisInst.starred.pop();
	}
	LS.set("starred-patterns", thisInst.starred);
  return true;
}

var removeFromStarred = function(item){
  thisInst.starred.splice(thisInst.starred.indexOf(item), 1);
	LS.set("starred-patterns", thisInst.starred);
  viewStarred();
}

var toggleFromStarred = function(){
  if(!addToStarred()){
    removeFromStarred(settings.pattern_ref);
  }
}

var viewStarred = function(){
  var starredBlock = "";
 
	if(thisInst.starred.indexOf(settings.pattern_ref) != -1){
  $('.addToStarred img').attr("src", "/static/buttons/star-filled.png");
  } else {
  $('.addToStarred img').attr("src", "/static/buttons/star-empty.png");
}

  for (var s in thisInst.starred){
    var tpr = thisInst.starred[s];
    var templateVars = {seed:0,patref:tpr,metro:true,map:"sn",patlen:4,tempo:100};
    starredBlock += '<div class="starredImagePreview"  ><img onclick="loadStarredPattern(\''+tpr+'\')" alt="preview" src="' + buildCustomTemplateUrl(imagebaseurl + hburlext, templateVars) + '" /><span onclick="removeFromStarred(\''+tpr+'\')">X</span></div>';
  }
  $('.starredPreviewPane .previews').html(starredBlock);
}

var setupSettings = function() {
    var s = LS.get("app-settings");
    if (s) {
        settings = Object.assign(settings, s);
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

	updateCurrentSound();

};

setupSettings();
loadStarred();

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

function cycleMapIndex(cur, map){
  return (cur + 1) % map.length;
}

function cycleCurrentSound(){
  var cmi = cycleMapIndex(settings.sound_map_index, soundValuesMap);
	settings.sound_map_index = cmi;
  updateCurrentSound();	
}

function updateCurrentSound(){
  var cmo = soundValuesMap[settings.sound_map_index];
  var soundMap = cmo.map;
  settings.sound_map_map = soundMap;
  var soundText = cmo.text;
  $(".currentSound").html(soundText);
}

$(".currentSound").click(function(){
		cycleCurrentSound();
    callToRefresh();
});

function buildCustomTemplateUrl(base, items){
    return base.replace("{{SEED}}", items.seed)
        .replace("{{PATLEN}}", items.patlen)
        .replace("{{TUPLES}}", items.tuples)
        .replace("{{NESTED}}", items.nested)
        .replace("{{NOMETRO}}", items.nometro)
        .replace("{{NORESTS}}", items.norests)
        .replace("{{TEMPO}}", items.tempo)
        .replace("{{PATREF}}", items.patref)
        .replace("{{MAP}}", items.map);
}

function buildTemplateUrl(base) {
    return base.replace("{{SEED}}", cseed)
        .replace("{{PATLEN}}", settings.pattern_length)
        .replace("{{TUPLES}}", settings.pattern_tuples)
        .replace("{{NESTED}}", settings.nested_tuples)
        .replace("{{NOMETRO}}", !settings.metronome_on)
        .replace("{{NORESTS}}", !settings.rests_on)
        .replace("{{TEMPO}}", settings.tempo)
        .replace("{{PATREF}}", settings.pattern_ref)
        .replace("{{MAP}}", settings.sound_map_map);
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

				if(LS.get("editsoundmap")){
					settings.sound_map_map = (LS.get("editsoundmap")).join(",");
					LS.set("editsoundmap", undefined);
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

function incPlus(field, amnt){
    amnt = parseInt(amnt) || 1;
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = isNaN(curval) ? 0 : curval + amnt;
    $('input[name=' + field + ']').val(newval);
	debounce(function inc(){
      $('input[name=' + field + ']').change();
	}, 200);
}

function decMin(field, amnt){
    amnt = parseInt(amnt) || 1;
    var curval = parseInt($('input[name=' + field + ']').val());
    var newval = isNaN(curval) ? 0 : curval - amnt;
    $('input[name=' + field + ']').val(newval);
	debounce(function dec(){
      $('input[name=' + field + ']').change();
	}, 200);

}
var timeoutId = 0;

$('.plusbtn').on('mousedown touchstart', function(ev) {
    ev.preventDefault();
    var obj = $(this).attr('field');
    var amnt = $(this).attr('amount');
    incPlus(obj, amnt);
    timeoutId = setInterval(function(){incPlus(obj, amnt)}, 110);
}).on('mouseup mouseleave touchend', function() {
    clearInterval(timeoutId);
});

$('.minusbtn').on('mousedown touchstart', function(ev) {
    ev.preventDefault();
    var obj = $(this).attr('field');
    var amnt = $(this).attr('amount');
    decMin(obj, amnt);
    timeoutId = setInterval(function(){decMin(obj, amnt)}, 110);
}).on('mouseup mouseleave touchend', function() {
    clearInterval(timeoutId);
});

$('.addToStarred').on('click', function(){
	//  addToStarred();
  toggleFromStarred();
	viewStarred();
});

$('.closeStarredPreviewPane').on('click',function(){
 $('.starredPreviewPane').hide(); 
});

$('.viewStarred').on('click',function(){
  viewStarred();
  $('.starredPreviewPane').toggle(); 
});

$('.audioplaybtn').on('click', function(){
  if (state.playing){
    $('.audiosrc').get(0).pause();
    $('.audiosrc').get(0).currentTime = 0;
    $('.audiosrc').get(0).pause();
    $('.audioplaybtn .playimg').show();
    $('.audioplaybtn .stopimg').hide();
  } else {
    $('.audiosrc').get(0).play();
    $('.audioplaybtn .stopimg').show();
    $('.audioplaybtn .playimg').hide();
  }
  state.playing = !state.playing;
});

$('.openStarredPanel').on('click',function(){
  $('.starredPanel').toggle();
});
