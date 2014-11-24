var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var mongo = require('mongodb');
var geocoder = require('geocoder');

var ipaddress = process.env.OPENSHIFT_MONGODB_DB_HOST || "localhost";
var port = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
var dbName = process.env.OPENSHIFT_APP_NAME || 'rightmovedb';
var dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
var dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;

var Server = mongo.Server, 
		Db = mongo.Db, 
		BSON = mongo.BSONPure;

var server = new Server(ipaddress, port, {auto_reconnect: true});
db = new Db(dbName, server);

db.open(function(err,db) {
	if(!err) {
		console.log("Connected to 'rightmovedb' database");
		db.collection('soldprices', {strict:true}, function(error, collection) {});
	}
});


var stats = {};
var data = {};

var town = process.argv[2];
var years = process.argv[3];

var findURL = "/house-prices/" + town + ".html?radius=1.0&year=" + years;

var crawler = new Crawler(config.baseURL, findURL, parseInt(config.port), parseInt(config.retryInterval));

crawler.downloadUnsupported=false;
crawler.discoverResources=false;

crawler.on("fetchstart", function(queueItem) {
	stats[queueItem.path] = new Date().getTime();
	console.log("Fetch Start : " + queueItem.url);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	console.log("Fetch Complete : " + queueItem.url + ", time : "  + (new Date().getTime() - stats[queueItem.path]));
	// console.log(responseBuffer.toString());
	
	var $ = Cheerio.load(responseBuffer);

	$("div.soldDetails").each(function(i,e) {
		var address = $(e).find(".soldAddress").text();
		var recent = $(e).find("table").children().first();
		var children = $(recent).children("td");

		var type = $(children[1]).text().trim();
		var arr = type.split(",");

		var number = parseInt(($(children[3]).text())[0]);
		var soldDate = new Date($(children[2]).text().trim());

		// Geocoding
		// geocoder.geocode(address, function ( err, data ) {
  // 			console.log(JSON.stringify(data));
		// });

		var price = $(children[0]).text().trim();


		var property = {
			"_id" : address,
			"price"   : Number(price.replace(/[^0-9\.]+/g,"")),
			"number" : number,
			"house" : arr[0].trim(),
			"address" : address,
			"type" : type,
			"date" : soldDate.getTime(),
			"tenure" : arr[1].trim()
		};

		// console.log(property);

		db.collection('soldprices', function(error, collection) {
			collection.insert(property, {safe: true}, function(err, result) {
				if(err) {
					console.log("ERROR : " + err);
				} else {
					console.log('Success : ' + JSON.stringify(result[0]));
				}
			});
		});

	});
		
	var href = $('div.slidercontainer').children().last().find('a.pagenavigation').attr('href');

	if(href) {
		crawler.queue.add("http",config.baseURL,parseInt(config.port), 
				$('div.slidercontainer').children().last().find('a.pagenavigation').attr('href'));
	}

	crawler.queue.getWithStatus("queued").forEach(function(queueItem) {
			 console.log("Whoah, the request for %s queued!",queueItem.url);
	});

});

crawler.on("complete", function() {
	console.log("done");
	db.close();
});

crawler.start();
