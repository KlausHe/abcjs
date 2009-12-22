// Place your application-specific JavaScript functions and classes here
// This file is automatically included by javascript_include_tag :defaults

var abcParser = null;

EditArea = Class.create();

EditArea.prototype = {
	initialize: function (id) {
		this._id = id;
	},
	
	_id : '',
	
	set : function(str)
	{
		//editAreaLoader.setValue(id, str);
		$(this._id).value =str;
	},
	
	get : function()
	{
		return $(this._id).value;
	},
	
	getSelection : function()
	{
		//selection = editAreaLoader.getSelectionRange('abc');
		return {start: $(this._id).selectionStart, end: $(this._id).selectionEnd};
	},
	
	setSelection : function(start, end)
	{
		//editAreaLoader.setSelectionRange('abc', pos, parseInt(pos)+1);
		$(this._id).setSelectionRange(start,end);
		$(this._id).focus();
	}
};

editArea = new EditArea('abc');

/////////////////////////////////////////////////////////////////////////////////

function redrawCurrent()
{
	abc_keystroke();
}

function pickTuneAndPdf(pdf_id, folder, abc_file)
{
	var sel = abc_contents_output[abc_file];
	$("persistent_url").update("http://" + window.location.host + "/comparison?tune=" + abc_file);
	var filename = abc_file.substring(0, abc_file.lastIndexOf('.'));
	var pdf_file = "/testdata/" + folder + '/' + filename.gsub('\\+', '%2B') + '.ps';
	$("abcm2ps_output").update(sel.out.gsub('\n', '<br />'));

	editArea.set(sel.abc);
	abc_keystroke();
	var pdf = $(pdf_id);
	pdf.innerHTML = "<embed src='" + pdf_file + "' height='100%' width='100%'>";
}

function pickTune(value)
{
	editArea.set(value.gsub('`n', '\n').gsub('`a', "'"));
	abc_keystroke();
}

function createPDF()
{
	var t = editArea.get();
	new Ajax.Updater('ajax_status', '/tunes/createPdf', 
	{parameters: {abc: t, authenticity_token: window.authenticity_token}});
}

function createMIDI()
{
	var t = editArea.get();
	new Ajax.Updater('ajax_status', '/tunes/createMidi', 
	{parameters: {abc: t, authenticity_token: window.authenticity_token}});
}

function save()
{
	var t = editArea.get();
	new Ajax.Updater('ajax_status', '/tunes/save', 
	{parameters: {abc: t, authenticity_token: window.authenticity_token}});
}

function magnify(value)
{
	DrawNotation.prototype.setCssZoom(value);
	abc_keystroke();
}

function saveCurrentToTest()
{
	var onSuccess = function(resp) {
		var arr = resp.responseText.split('/');
		var fname = arr[arr.length-1];
		fname = fname.split(' ')[0];
		$('paul_failed_tests').appendChild(new Element('option').update(fname));
		abc_contents_output[fname] = { abc: editArea.get(), out: "Unknown: reload page to see this data." }
	};
	var t = editArea.get();
	new Ajax.Updater('ajax_status', '/tunes/save_test',
	{parameters: {abc: t, authenticity_token: window.authenticity_token}, onSuccess: onSuccess});
}
/////////////////////////////////////////////////////////////////////////////////

var playEmbedded = null;
window.onload = function() {
	playEmbedded = new PlayEmbedded();
}

function play()
{
	var t = editArea.get();
	if (abcParser === null)
		abcParser = new ParseAbc();
	abcParser.parse(t);
	//selection = editArea.getSelection();
	playEmbedded.play(abcParser.getTune());
}

function stopPlay()
{
	playEmbedded.stop();
}

//function doScale() {
//	var paper = Raphael(document.getElementById("canvas"), 1000, 600);
//	var font = paper.getFont("Maestro", 500);
//	scale_font(font, 30, paper);
//}


var printer = null;
var paper = null;
//function parseABC() {
//  var abctrees;
//	try {
//		//console.profile();
//		  abctrees = new ABCParser(document.getElementById("abc").value).parse();
////		  var scratch = $('scratch');
////		  scratch.innerHTML = abctrees.toJSON();
//
//		  if (paper === null)
//			 paper = Raphael(document.getElementById("canvas"), 1000, 600);
//		 else
//			 $("canvas").innerHTML = "";
//		 if (printer === null)
//			  printer = new ABCPrinter(paper);
//		  printer.printABC(abctrees[0]);
//		//console.profileEnd();
//	} catch (e) {
//		if (e.text) {
//		  alert (e +" "+ e.text);
//		} else {
//		  throw e;
//		}
//	}
//}

/////////////////////////////////////////////////////////////////////////////////

var bReentry = false;
function abc_keystroke()
{
	if (bReentry)
		return;
	bReentry = true;

	// clear out any old tune
	var done = false;
	var i = 0;
	while (!done) {
		var el = $("canvas"+i);
		if (el)
			el.innerHTML = "";
		else
			done = true;
		i++;
	}

	try {
		var t = editArea.get();
		var tunebook = new AbcTuneBook(t);
		if (abcParser === null)
			abcParser = new ParseAbc();
		
		for (i = 0; i < tunebook.tunes.length; i++) {
			try {
				abcParser.parse(tunebook.tunes[i].abc);
				var tune = abcParser.getTune();
				var warnings = abcParser.getWarnings();
				if (warnings) {
					warnings = warnings.join("<br />");
					$('warnings').update(warnings);
				}
				else
					$('warnings').update('No errors');
				var canvas = $("canvas"+i);
				paper = Raphael(canvas, 1500, 1500);
				printer = new ABCPrinter(paper);
				printer.printABC(tune);
			} catch (e) {
			  $("canvas"+i).update("error: " + e);
			  throw e;
			}
			var paths = $$('path');
			var click = function() {
				var x = this.getAttribute('abc-pos');
				//$(this).setStyle({ backgroundColor: '#ff0000' });
				if (x && !x.startsWith('-1')) {
					var arr = x.split(',');
					editArea.setSelection(parseInt(arr[0])-1, parseInt(arr[1]));
				}
			};
			paths.each(function(path) {
				path.onclick = click;
			});
		}
	} catch (e) {
	  $("canvas0").update("error: " + e);
	  throw e;
	}
	
	bReentry = false;
}

function click()
{
	abc_keystroke();
}

function selectNote(div)
{
	var pos = div.getAttribute("charPos");
	selection['start'] = pos;
	if (pos != undefined)
	{
		editArea.setSelection(parseInt(pos), parseInt(pos)+1);
	}
	abc_keystroke();
}

function doGradeTest(url, failed_tests, passed_tests, pass) {
	var failed = $(failed_tests);
	var passed = $(passed_tests);
	var selection = pass ? failed.options[failed.selectedIndex] : passed.options[passed.selectedIndex];
	var value = selection.innerHTML;
	selection.remove();
	if (pass)
		passed.appendChild(selection);
	else
		failed.appendChild(selection);

	new Ajax.Request(url, {parameters: {pass: pass, value: value, authenticity_token: window.authenticity_token}});
}
