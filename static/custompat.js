/* jshint strict:false */
/* global clearTimeout, setTimeout */

window._ns_drumgen_editor = {};
var thisEditor = window._ns_drumgen_editor;

thisEditor.arr = [
    [
        [3, 1],
        [2, 2],
        [3, 3],
        [0, 2]
    ]
];

thisEditor.layers = 1;
thisEditor.dbtimer = null;
thisEditor.globpatref = "";

var LS = {
    get: function(a) {
        return JSON.parse(window.localStorage.getItem(a));
    },
    set: function(a, b) {
        window.localStorage.setItem(a, JSON.stringify(b));
    }
};

function urlparam(name) {
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results === null) {
        return null;
    } else {
        return results[1] || 0;
    }
}

function makePatternSane(pat) {
    pat = JSON.parse(JSON.stringify(pat));
    for (var i in pat) {
        if (!Array.isArray(pat[i])) {
            pat[i] = [pat[i]];
            //	} else {
            //    pat[i] = makePatternSane(pat[i]);
        }
    }
    return pat;
}


function makePatternUnsane(pat) {
    pat = JSON.parse(JSON.stringify(pat));
    for (var i in pat) {
        if (pat[i].length === 1) {
            pat[i] = pat[i][0];
        } else {
            pat[i] = makePatternUnsane(pat[i]);
        }
    }
    return pat;
}

function syncLayerSizes() {
    while (thisEditor.arr.length > thisEditor.layers) {
        thisEditor.arr.pop();
    }

    while (thisEditor.soundMapIndex.length > thisEditor.layers) {
        thisEditor.soundMapIndex.pop();
        thisEditor.soundMap.pop();
    }

    while (thisEditor.arr.length < thisEditor.layers) {
        var newArrLayer = [];
        for (var bc = 0; bc < thisEditor.arr[0].length; bc++) {
            newArrLayer.push([0]);
        }
        thisEditor.arr.push(newArrLayer);
    }
    while (thisEditor.soundMapIndex.length < thisEditor.layers) {
        thisEditor.soundMapIndex.push(0);
        thisEditor.soundMap.push("sn");
    }
}


function cycleTotalLayers() {
    var maxLayers = 2;
    thisEditor.layers = thisEditor.layers % maxLayers + 1;
    $('.stave-counter').html("Layers: " + thisEditor.layers);
    init();
}

function gotoMain() {
    LS.set("editidpattern", thisEditor.arr);
    LS.set("globpatref", thisEditor.globpatref);
    LS.set("soundmap", thisEditor.soundMap);
    window.location.href = '/static/page.html';
}

function debouncer(func, delay) {
    clearTimeout(thisEditor.dbtimer);
    thisEditor.dbtimer = setTimeout(func, delay);
}

function shrinkMe(pos) {
    //pos = pos.split(",");
    //pos.pop();
    //pos = pos.join(",");
    thisEditor.arr = shrinkArr(thisEditor.arr, pos);
    init();
}

function shrinkArr(arr, pos) {

    var np = pos.split(",");
    if (np.length > 1) {
        var arrpos = np.shift();
        arr[parseInt(arrpos)] = shrinkArr(arr[parseInt(arrpos)], np.join(","));
    } else {
        if (arr[parseInt(np[0])].length > 1) {
            arr[parseInt(np[0])].pop();
        }
    }
    return arr;
}

function extendMe(pos) {
    //pos = pos.split(",");
    //pos.pop();
    //pos = pos.join(",");
    thisEditor.arr = extendArr(thisEditor.arr, pos);
    init();
}

function extendArr(arr, pos) {
    var np = pos.split(",");
    if (np.length > 1) {
        var arrpos = np.shift();
        arr[parseInt(arrpos)] = extendArr(arr[parseInt(arrpos)], np.join(","));
    } else {
        if (arr[parseInt(np[0])].length < 9) {
            arr[parseInt(np[0])].push(0);
        }
    }
    return arr;
}

function setarr(pos, newval) {
    thisEditor.arr = setme(thisEditor.arr, pos, newval);
    init();
}

function setme(arr, pos, newval) {
    var np = pos.split(",");
    if (np.length > 1) {
        var arrpos = np.shift();
        arr[parseInt(arrpos)] = setme(arr[parseInt(arrpos)], np.join(","), newval);
    } else {
        arr[parseInt(np[0])] = parseInt(newval) % 7;
    }
    return arr;
}

function incarr(pos) {
    thisEditor.arr = incme(thisEditor.arr, pos);
    init();
}

function incme(arr, pos) {
    var np = pos.split(",");
    if (np.length > 1) {
        var arrpos = np.shift();
        arr[parseInt(arrpos)] = incme(arr[parseInt(arrpos)], np.join(","));
    } else {
        arr[parseInt(np[0])] = (arr[parseInt(np[0])] + 1) % 7;
    }
    return arr;
}

function blockAppender(sect, curstr, curlevel) {

    for (var i in sect) {
        //var newlevel = curlevel + "" + i + ",";
        var newlevel = curlevel.split(',').filter(function(a) {
            return parseInt(a) >= 0
        });
        newlevel.push(i);
        newlevel = newlevel.join(',');
        if (Array.isArray(sect[i])) {
            curstr += '<div class="notegroup">';
            curstr += '<div class="pmbtngroup"><div class="appender plusimg" onclick="extendMe(\'' + newlevel + '\')"></div> <div class="appender minusimg" onclick="shrinkMe(\'' + newlevel + '\')"></div></div>';
            curstr += blockAppender(sect[i], "", newlevel);
            curstr += '</div>';
        } else {
            //curstr += '<div onclick="incarr(\''+ newlevel +'\'); openNoteSelector(\'' + newlevel + '\')" class="nselector ' + newlevel + ' ntype' + sect[i] + '" > </div>';
            curstr += '<div onclick="openNoteSelector(\'' + newlevel + '\')" class="nselector ' + newlevel + ' ntype' + sect[i] + '" > </div>';
        }
    }
    return curstr;
}


function openNoteSelector(pos) {
    $('.hover-selector-block .hover-selector-item').each(function() {
        $(this).attr('onclick', 'setarr("' + pos + '","' + $(this).attr('typeval') + '"); closeHoverSelector();');
    });
    $('.hover-selector-block').show();
}

function closeHoverSelector() {
    $('.hover-selector-block').hide();
}

function mainplus() {
    if (thisEditor.arr[0].length < 16) {
        for (var s in thisEditor.arr) {
            thisEditor.arr[s].push([0]);
        }
    }
    init();
}

function mainmin() {
    if (thisEditor.arr[0].length > 2) {
        for (var s in thisEditor.arr) {
            thisEditor.arr[s].pop();
        }
    }
    init();
}

function cycleMapIndex(cur, map) {
    return (cur + 1) % map.length;
}

var soundValuesMap = [{
    "map": "sn",
    "text": "Snare"
}, {
    "map": "ss",
    "text": "Sidestick"
}, {
    "map": "wbl",
    "text": "Woodblock"
}, {
    "map": "boh",
    "text": "Bongo"
}];

thisEditor.soundMapIndex = [0];
thisEditor.soundMap = ["sn"];

function cycleSelectedSound(sid) {
    var cmi = cycleMapIndex(thisEditor.soundMapIndex[sid], soundValuesMap);
    thisEditor.soundMapIndex[sid] = cmi;
    updateCurrentSound(sid);
}

function updateCurrentSound(sid) {
    var cmo = soundValuesMap[thisEditor.soundMapIndex[sid]];
    var soundMap = cmo.map;
    thisEditor.soundMap[sid] = soundMap;
    var soundText = cmo.text;
    $(".soundSelector-" + sid).html(soundText);
}

function generateSoundSelector() {
    var items = "";
    for (var i in thisEditor.arr) {
        items += '<span class="buttonLike soundSelector-' + i + '" onclick="cycleSelectedSound(' + i + ')"> ' + soundValuesMap[thisEditor.soundMapIndex[i]].text + ' </span><br/>';
    }
    return items;
}

function init() {
    syncLayerSizes();
    var sigSect = "";

    sigSect += 'Signature ' + thisEditor.arr[0].length + '/4 ';
    sigSect += "<br/>";
    sigSect += "Sounds: <br/>" + generateSoundSelector();

    $('.sigSect').html(sigSect);

    var str = "";
    for (var ba in thisEditor.arr) {
        str += '<div class="layerSect">';
        str += '<div class="randomizeLayer" style="display: none;"><img src="/static/buttons/dice.png" /></div>';
        str += blockAppender(thisEditor.arr[ba], "", "" + ba);
        str += '</div>';
        str += '<br/>';
    }
    str += "<br/>";
    $('.editSect').html(str);
    $.get('/public/custommaptopatref/' + JSON.stringify(makePatternUnsane(thisEditor.arr))).then(function(d) {
        thisEditor.globpatref = d.patref;
        debouncer(function() {
            //$('.customimage').attr("src",'https://drumgen.apollolms.co.za/public/image?app=true&patref='+d.patref);
            //$('.customaudio').attr("src",'https://drumgen.apollolms.co.za/public/audio?app=true&patref='+d.patref);
            $.get('/public/image?app=true&patref=' + d.patref);
            $.get('/public/audio?app=true&patref=' + d.patref);
        }, 2000);
    });
}

var patref = urlparam("patref");
if (patref) {
    $.get('/public/patreftocustommap/' + patref).then(function(data) {
        for (var d in data.unmapped) {
            data.unmapped[d] = makePatternSane(data.unmapped[d]);
        }
        thisEditor.arr = data.unmapped; //makePatternSane(data.unmapped);
        thisEditor.layers = thisEditor.arr.length;
        $('.stave-counter').html("Layers: " + thisEditor.layers);
        init();
    });
} else {
    init();
}
