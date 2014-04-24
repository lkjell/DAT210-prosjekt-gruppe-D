
// Global variables
var imageById = new Array();

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
}

// Quentin http://stackoverflow.com/questions/979975
var QueryString = function () {
	// This function is anonymous, is executed immediately and 
	// the return value is assigned to QueryString!
	var query_string = {};
	var query = window.location.search.substring(1);
	var vars = query.split("&");
	for (var i=0;i<vars.length;i++) {
		var pair = vars[i].split("=");
			// If first entry with this name
		if (typeof query_string[pair[0]] === "undefined") {
			query_string[pair[0]] = pair[1];
			// If second entry with this name
		} else if (typeof query_string[pair[0]] === "string") {
			var arr = [ query_string[pair[0]], pair[1] ];
			query_string[pair[0]] = arr;
			// If third or later entry with this name
		} else {
			query_string[pair[0]].push(pair[1]);
		}
	}
	return query_string;
} ();

$( function() { // When document is ready

	console.log( "starting" );

	$( '#searchtext' ).change( function( event ) {
		var txt = $( this ).val();
		console.log( txt );
		search( txt, function( data, status, xhr ) { //success
			buildGrid( data );
		}, function( xhr, status, error ) { // error
			console.log( "id-list fetch at textbox update failed" );
		});
	});

	$( '.images' ).sortable().disableSelection();

	$( '.largeImgPanel' ).dblclick( function() {
		$( '.largeImgPanel' ).css( 'visibility', 'hidden' );
	});


	search( QueryString.filter, function( data, status, xhr ) { //success
		$( '#searchtext' ).val( QueryString.filter );
		buildGrid( data );
	});

	$( ".image" ).dblclick( showLargeImagePanel );
	$( ".pagecontainer" ).click(function() { $('.largeImgPanel').css('visibility', 'hidden'); });
	

});

// Constructor for Image objects
// all metadata are stored in these objects
function Image( id, metadata ) {

	// private members
	var _xpkeywords;
	var that = this;

	function setMetadata( metadata ) {
		_xpkeywords = metadata.keywords;
		that.path   = metadata.path;
		that.width  = metadata.width;
		that.height = metadata.height;
		that.hasdata = true;
	}

	// public members
	this.id = id;
	this.hasdata = false;
	if( metadata != undefined ) setMetadata( metadata );

	this.fetchMetadata = function( after ) {
		console.log( "fetching metadata for img "+ this.id );
		get( "meta?img_id="+ this.id, function( data, status, xhr ) {
			setMetadata( data );
			if ( typeof after == 'function' ) after( data, status, xhr );
		});
	}

	this.getKeywords = function() { return _xpkeywords;	}

	this.addKeywords = function( keywords ) {
		for( var i in arguments ) {
			if( !( typeof arguments[i] === 'string' ) || arguments[i] in _xpkeywords )
				return; // TODO: remove instead
		}
		post( "meta{"+ this.id +"}", {XPKeywords: arguments},
			function( data, status, xhr ) {
				alert( data );
			}
		);
	}

	this.removeKeywords = function( keywords ) {
		for( var i in arguments ) {
			if( !( typeof arguments[i] === 'string' )) return;
		}
	}

	imageById[id] = this;
}

function get( url, success, error ) {
	$.ajax({
		url: url,
		type: 'GET',
		dataType: 'json',
		success: success,
		error: error
	});
}

function post( url, plainObject, success, error ) {
	$.ajax({
		url: url,
		type: 'POST',
		dataType: 'json',
		data: plainObject,
		success: success,
		error: error
	});
}

function search( string, success, error ) {
	string = ( string == undefined ) ? "search" : "search?string="+ string;
	$.ajax({
		url: string,
		type: 'GET',
		dataType: 'json',
		success: success,
		error: error
	});
}

function sortBy() {}

function buildGrid( ids ) {
	console.log( ids.toString() );
	var images = $( '.images' ).empty();
	for( var i=0; i<ids.length; i++ ) {
		if( imageById[ids[i]] == undefined ) new Image( ids[i] );
		images.append(
			$( '<li>' ).attr( 'class', "image" ).attr( 'id', ids[i] ).append(
			$( '<img>' ).attr( 'src', "img/?img_id="+ ids[i] ))
		);
	}
	$( '.image' ).hover(
		function() { this.style.zIndex = '2'; }, // mouse enter
		function() { this.style.zIndex = '1'; }  // mouse leave
	).click( function() {
		updateSidebar( $( this ).attr( 'id' ));
	}).dblclick( showLargeImagePanel );
}

function updateSidebar( img_id ) {
	var image = imageById[img_id];
	if ( !image.hasdata ) image.fetchMetadata( writeIt );
	else writeIt();
	function writeIt() {
		var container = $( '<div>' );
		container.append(
			$( '<p>' ).text( "filepath: "+ image.path ),
			$( '<p>' ).text( "dimensions: "+ image.width +" x "+ image.height ),
			$( '<p>' ).text( "keywords: "+ image.getKeywords() )
		);
		$( ".right" ).html( container );
	}
}

function requestMetadata( file_id ) {
	console.log("ajax request "+ file_id);
	$.ajax({
		url: "getTags?img_id="+ file_id,
		dataType: 'json',
		success: function( data, status, xhr ) {
			dom = $( '<div>' );
			recursive( dom, data );
			dom.accordion({
				heightStyle: "content"
			});
			/*$.map(data[0], function(value, key) {
				h3 = $( '<h3>' ).text( key );
				string = "";
				for ( var i=0; i < value.length; i++ ) {
					string += value;
				}
				sub = $('<div>').text( string );
				console.log( $('<div>').append(sub).html() );
				//text += key + ": "
				accordion.append( h3, sub );
			});

			$( ".right" ).append( accordion );*/
		},
		error: function( xhr, status, error ) {
			alert( status +"\n"+ error );
		}
	});

	function recursive(dom, data) {

		$.map(data, function( value, key ) {
					console.log( "key; " + key );
			h3 = $( '<h3>' ).text( key );
			sub = $('<div>');
			for ( var i = 0; i < value.length; i++ ) {
				if( i === 0 ){
					if ( value[i] === null ) { continue;	}
					ul = $('<ul>')
					for(i=0;i<value.length;i++){
						//console.log( faen + ":" + helvette );
						ul.append( $('<li>').text( value[i] ));
						console.log(ul.html())
					};
					//console.log( $('<div>').append(ul).html() );
					sub.html( ul );
					console.log( $('<div>').append(sub).html() );
					break;
				}
				recursive(dom, value[i]);
			}
			
			//console.log( $('<div>').append(sub).html() );
			//text += key + ": "
			dom.append( h3, sub );
		});
		console.log("fuck you");
		$( ".right" ).html( dom );
	}
}

function showLargeImagePanel() {
	var imgSource = $( this ).find('img').attr('src');
	console.log(imgSource);
	$('#largeImg').attr( 'src', imgSource );
	$('.largeImgPanel').css( 'visibility', 'visible');
	if(document.selection) document.selection.empty();
	if(window.getSelection) window.getSelection().removeAllRanges();
}



// Copyright 2006-2007 javascript-array.com

var timeout	= 500;
var closetimer	= 0;
var ddmenuitem	= 0;

// open hidden layer
function mopen( id )
{	
	// cancel close timer
	mcancelclosetime();

	// close old layer
	if(ddmenuitem) ddmenuitem.style.visibility = 'hidden';

	// get new layer and show it
	ddmenuitem = document.getElementById(id);
	ddmenuitem.style.visibility = 'visible';

}
// close showed layer
function mclose()
{
	if(ddmenuitem) ddmenuitem.style.visibility = 'hidden';
}

// go close timer
function mclosetime()
{
	closetimer = window.setTimeout(mclose, timeout);
}

// cancel close timer
function mcancelclosetime()
{
	if(closetimer)
	{
		window.clearTimeout(closetimer);
		closetimer = null;
	}
}
