window._ns_drumgen_editor = {};
var thisEditor = window._ns_drumgen_editor;

var LS = {
    get: function(a) {
        return JSON.parse(window.localStorage.getItem(a));
    },
    set: function(a, b) {
        window.localStorage.setItem(a, JSON.stringify(b));
    }
};

function urlparam(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
       return null;
    }
    else{
       return results[1] || 0;
    }
}

function makePatternSane(pat){
	pat = JSON.parse(JSON.stringify(pat));
	for (var i in pat){
		if(!Array.isArray(pat[i])){
			pat[i] = [pat[i]];
		}
	}
	return pat;
}


function makePatternUnsane(pat){
	pat = JSON.parse(JSON.stringify(pat));
	for (var i in pat){
		if(pat[i].length == 1){
			pat[i] = pat[i][0];
		}
	}
	return pat;
}


  thisEditor.arr =  [[3,1],[2,2],[3,3],[0,2]];
	var arr =  [[3,1],[2,2],[3,3],[0,2]];
  thisEditor.dbtimer = null; 
  thisEditor.globpatref = "";

 function gotoMain(){
   LS.set("editidpattern", arr); 
   LS.set("globpatref", thisEditor.globpatref); 
	 window.location.href = '/static/page.html';
 }

function debouncer(func, delay){
		clearTimeout(thisEditor.dbtimer);
		thisEditor.dbtimer = setTimeout(func, delay);
}

function shrinkMe(pos){
		//pos = pos.split(",");
	  //pos.pop();
		//pos = pos.join(",");
		arr = shrinkArr([arr], pos)[0];
		init();
}

function shrinkArr(arr, pos){

	var np = pos.split(",");
		if(np.length > 1){
			var arrpos = np.shift();
			arr[parseInt(arrpos)] = shrinkArr(arr[parseInt(arrpos)],np.join(","));	
		} else {
			if(arr[parseInt(np[0])].length > 1){
			arr[parseInt(np[0])].pop();
			}
		}
		return arr;
	}

function extendMe(pos){
		//pos = pos.split(",");
		//pos.pop();
		//pos = pos.join(",");
		arr = extendArr([arr], pos)[0];
		init();
	}

function extendArr(arr, pos){

	var np = pos.split(",");
		if(np.length > 1){
			var arrpos = np.shift();
			arr[parseInt(arrpos)] = extendArr(arr[parseInt(arrpos)],np.join(","));	
		} else {
			if(arr[parseInt(np[0])].length < 8){
			arr[parseInt(np[0])].push(0);
				}
		}
		return arr;
	}

function incarr(pos){
		arr = incme([arr], pos)[0];
		init();
	}

function incme(arr, pos){
	var np = pos.split(",");
		if(np.length > 1){
			var arrpos = np.shift();
			arr[parseInt(arrpos)] = incme(arr[parseInt(arrpos)],np.join(","));	
		} else {
			arr[parseInt(np[0])] = (arr[parseInt(np[0])] +  1 ) % 7; 
		}
		return arr;
	}

function blockAppender(sect, curstr, curlevel){
	
	for ( var i in sect ){
		var newlevel = curlevel + "," + i;
		if(Array.isArray(sect[i])){
      curstr += '<div class="notegroup">';
			curstr +=  '<div class="pmbtngroup"><div class="appender plusimg" onclick="extendMe(\'' + newlevel + '\')"></div> <div class="appender minusimg" onclick="shrinkMe(\'' + newlevel + '\')"></div></div>';
			curstr +=  blockAppender(sect[i], "", newlevel);
			curstr += '</div>';
		} else {
			curstr += '<div onclick="incarr(\''+ newlevel +'\');" class="nselector ' + newlevel + ' ntype'+sect[i]+'" > </div>';
		}
	}
	return curstr;
}


function mainplus(){
  if(arr.length < 16){
  arr.push([0]);
  }
  init();
}

function mainmin(){
	if (arr.length > 2){
	arr.pop();
	}
	init();
}
	
function init(){
	var str = "";
	str += 'Signature ' + arr.length +  '/4 ';
	str += "<br/>";
  str += blockAppender(arr, "", "0");
	str += "<br/>";
	$('.editsect').html(str);
		$.get('/public/custommaptopatref/' + JSON.stringify([makePatternUnsane(arr)])).then(function(d){
		  thisEditor.globpatref = d.patref;
			debouncer(function(){
			//$('.customimage').attr("src",'https://drumgen.apollolms.co.za/public/image?app=true&patref='+d.patref);
			//$('.customaudio').attr("src",'https://drumgen.apollolms.co.za/public/audio?app=true&patref='+d.patref);
			$.get('/public/image?app=true&patref=' + d.patref);
		  $.get('/public/audio?app=true&patref=' + d.patref);
			}, 2000);

		});
	}
  var patref = urlparam("patref");
  if(patref){
     $.get('/public/patreftocustommap/' + patref).then(function(data){
  	   arr =  makePatternSane(data.unmapped[0]);
	  init();
   });
   }else{
  init();
}

