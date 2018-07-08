// LCD game JavaScript library
// Bas de Reuver (c)2018

var SCORE_HTML = 
		'<div class="infobox" id="scorebox">' +
		'  <div id="scorecontent">' +
		'    high-scores'
		'  </div>' +
		'  <a class="mybutton btnpop" onclick="hideScorebox();">Ok</a>' +
		'</div>';
var HS_URL = "http://bdrgames.nl/lcdgames/php/";

function displayScorebox() {
	hideInfobox();
	document.getElementById("scorebox").style.display = "inherit";
	//event.stopPropagation(); // stop propagation on button click event
}

function hideScorebox() {
	//var target = event.target || event.srcElement;
	// filter event handling when the event bubbles
	//if (event.currentTarget == target) {
		document.getElementById("scorebox").style.display = "none";
	//}
}

// -------------------------------------
// highscores object
// -------------------------------------
LCDGame.HighScores = function (lcdgame, gametitle, gametypes) {
	// save reference to game objects
	this.lcdgame = lcdgame;

	// display variables
	this.gametitle = gametitle;
	this.gametypes = gametypes;

	// highscore variables
	this._scorecache = [];
	this._scoretype = 0;
	this._namecache = "";
};

LCDGame.HighScores.prototype = {

    getGametype: function () {
		var res = "";
		if (this.gametypes) {
			this.lcdgame.gametype-1
			res = this.gametypes[this.lcdgame.gametype-1];
		};
		return res;
	},

	loadHighscores: function (typ) {

		// clear variables
		this._scorecache = [];
		this._scoretype = typ;
		this._namecache = "lcdgame_"+this.gametitle+"_hs"+typ;

		// load from localstorage
		var sc = window.localStorage.getItem(this._namecache);

		// error checking, localstorage might not exist yet at first time start up
		try {
			this._scorecache = JSON.parse(sc);
		} catch (e) {
			this._scorecache = []; //error in the above string(in this case,yes)!
		};
		// error checking just to be sure, if localstorage contains something else then a JSON array (hackers?)
		if (Object.prototype.toString.call(this._scorecache) !== "[object Array]") {
			this._scorecache = [];
		};
	},

    save: function () {
		window.localStorage.setItem(this._namecache, JSON.stringify(this._scorecache));
    },
	
    scoreIndex: function (sc, typ) {
		// refresh cache if needed
		if (typ != this._scoretype) {
			this.loadHighscores(typ);
		};

		var idx = -1;
		// check if new highscore
		for (var i = this._scorecache.length-1; i >= 0; i--) {
			if (sc > this._scorecache[i].score) {
				idx = i;
			} else {
				break;
			};
		};
		return idx;
	},

    saveLocal: function (plr, sc, lvl, typ) {
		var idx = this.scoreIndex(sc, typ);
		if (idx >= 0) {
			// insert new record
			var rec = {"player":plr, "score":sc, "level":lvl};
			this._scorecache.splice(idx, 0, rec);
			
			// remove last records, keep max 10
			var s = 10 - this._scorecache.length;
			if (s < 0) {
				this._scorecache.splice(s);
			};

			this.save();
		};
    },

    saveOnline: function (plr, sc, lvl, typ) {
			// additional client info
			var platform = navigator.platform;
			var browser  = this.guessBrowser();
			var language = navigator.language;
			var clientguid  = this.getClientGUID();
			
			// build url
			var url = HS_URL + "newhs.php";
			var paramsdata = 
				"gamename=" + this.gametitle +  // highscore data
				"&gametype=" + typ +
				"&player=" + plr + 
				"&score=" + sc +
				"&level=" + lvl +
				"&platform=" + platform + // client info
				"&browser=" + browser +
				"&language=" + language +
				"&lcdversion=" + LCDGAME_VERSION +
				"&clientguid=" + clientguid;			

			var request = new XMLHttpRequest();
			request.open('POST', url, true);
			request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
			//request.setRequestHeader("Content-length", paramsdata.length);
			//request.setRequestHeader("Connection", "close");

			// handle success or error
			request.onreadystatechange = function(receiveddata) {
				if (request.status >= 200 && request.status < 400) {
					if (request.readyState == 4 && request.status == 200) {
						// Success!
						// here you could go to the leaderboard or restart your game
						console.log('SUCCESS!!\nrequest.status='+ request.status + '\nrequest.response=' + request.response);
						var test = JSON.parse(request.response);
						if (test.result == 'OK') {
							console.log('Highscore sent succesfully');
							this.refreshGlobalHS();
							displayScorebox();
						} else {
							console.log('Highscore sent failed');
						};
					};
				} else {
					// We reached our target server, but it returned an error
					console.log('Highscore sent failed with error: ' + request.response);
					resulttxt.text += '\nerror!';
				}
			}.bind(this); // <- only change

			//debugger;
			//paramsdata = getUserAgentParams();
			request.send(paramsdata);
    },

    checkScore: function () {
		// save current score values, because will reset on background when new game starts
		var sc = this.lcdgame.score;
		var lvl = this.lcdgame.level;
		var typ = this.lcdgame.gametype;
		
		if (sc > 0) {
			// input name
			var plr = prompt("New highscore, enter your name and press enter to submit or press cancel.", "");

			if (plr != null) {
				this.saveLocal(plr, sc, lvl, typ);
				this.saveOnline(plr, sc, lvl, typ);
			};
		};
    },
	
	refreshGlobalHS: function () {
		var url = HS_URL + "geths.php" +
			"?gamename=" + this.gametitle +  // highscore data
			"&gametype=" + this.lcdgame.gametype;

		var xmlHttp = new XMLHttpRequest();
		xmlHttp.open("GET", url, true); // true for asynchronous 
		xmlHttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
		xmlHttp.onreadystatechange = function() { 
			if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
				this.afterRefreshGlobalHS(xmlHttp.responseText);
		}.bind(this); // <- only change
		xmlHttp.send(null);
	},
	
	afterRefreshGlobalHS: function (data) {
		// error checking, localstorage might not exist yet at first time start up
		try {
			this._scorecache = JSON.parse(data);
		} catch (e) {
			this._scorecache = []; //error in the above string(in this case,yes)!
		};
		// error checking just to be sure, if data contains something else then a JSON array (hackers?)
		if (Object.prototype.toString.call(this._scorecache) !== "[object Array]") {
			this._scorecache = [];
		};

		this.refreshHTML();
	},

	refreshHTML: function () {
		// build highscore rows
		var rows = "";
		for (var i = 0; i < 10; i++) {
			var rec = this._scorecache[i];
			
			if (typeof rec === "undefined") {
				rec = {"player":".....", "score":0, "level":1};
			};
			
			rows = rows + "      <tr><td>" + (i+1) + ".</td><td>" + rec.player + "</td><td>" + rec.score + "</td></tr>";
		};

		// game name and column headers
		var mod = this.getGametype();
		mod = (mod == "" ? mod : " (" + mod + ")");
		var str =
			"<h1>" + this.gametitle + mod + "</h1>" +
			"<table>" +
			"      <tr><td>Rk.</td><td>Name</td><td>Score</td></tr>" +
			rows +
			"    </table>";
			
		// refresh html content
		this.lcdgame.scorecontent.innerHTML = str;
    },

	//uuidv4: function () {
	//	var patchcrypto = window.crypto || window.msCrypto; // IE11 -> msCrypto
	//	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function(c) {
	//		return (c ^ patchcrypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	//		}
	//	)
	//},

	uuidv4: function () {
		// simpler uuid generator, better browser compatibility (found at https://gist.github.com/jcxplorer/)
		var uuid = "";
		var random;
		for (var i = 0; i < 32; i++) {
			random = Math.random() * 16 | 0;

			if (i == 8 || i == 12 || i == 16 || i == 20) {
				uuid += "-"
			}
			uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
		}
		return uuid;
	},
		
	getClientGUID: function () {
		var guid = window.localStorage.getItem("lcdgame_client_guid");
		if (!guid) {
			// create one
			guid = this.uuidv4();
			window.localStorage.setItem("lcdgame_client_guid", guid);
		}
		return guid;
	},
		
	guessBrowser: function () {
		// Opera 8.0+
		if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0) {
			return "Opera 8.0+";
		} else
		// Firefox 1.0+
		if (typeof InstallTrigger !== 'undefined') {
			return "Firefox 1.0+";
		} else
		// Safari 3.0+ "[object HTMLElementConstructor]" 
		if (/constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof safari !== 'undefined' && safari.pushNotification))) {
			return "Safari 3.0+";
		} else
		// Internet Explorer 6-11
		if ( /*@cc_on!@*/false || !!document.documentMode) {
			return "Internet Explorer 6-11";
		} else
		// Edge 20+
		if ( !!window.StyleMedia) {
			return "Edge 20+";
		} else
		// Chrome 1+
		if ( !!window.chrome && !!window.chrome.webstore) {
			return "Chrome 1+";
		} else {
			return "Unknown";
		};
	}
};

//LCDGame.HighScores.prototype.constructor = LCDGame.HighScores;
