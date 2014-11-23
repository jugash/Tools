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
		db.collection('properties', {strict:true}, function(error, collection) {});
	}
});


var stats = {};
var data = {};

var town = process.argv[2];
var days = process.argv[3];

var findURL = "/property-for-sale/" + town + ".html?maxPrice=250000&minBedrooms=1&radius=1.0&partBuyPartRent=false&?maxDaysSinceAdded=" + days;

var crawler = new Crawler(config.baseURL, findURL, parseInt(config.port), parseInt(config.retryInterval));

crawler.downloadUnsupported=false;
crawler.discoverResources=false;

/*
var conditionId = crawler.addFetchCondition(function(parsedURL) {
	var result =  (parsedURL.uriPath.match(/^\/property-for-sale\/Durham.html/i) 
			|| parsedURL.uriPath.match(/^\/property-for-sale\/property-[0-9]*.html/i))
			&& !parsedURL.path.match(/locationIdentifier=/i);

	return result;
});
*/
crawler.on("fetchstart", function(queueItem) {
	stats[queueItem.path] = new Date().getTime();
	console.log("Fetch Start : " + queueItem.url);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	console.log("Fetch Complete : " + queueItem.url + ", time : "  + (new Date().getTime() - stats[queueItem.path]));

	var $ = Cheerio.load(responseBuffer);
	if(queueItem.path.match(/^\/property-for-sale\/property-[0-9]*.html/i)) {

		// console.log(responseBuffer.toString());

		var price = 0;
		var address = $('h2','#addresscontainer').text().trim();
		var type = $('h1#propertytype').text().trim();
		
		var number = 0;
		var house = "";

		if($('#amount')) {
			price = parseInt($('#amount').text().replace(/£|,/gi,'').trim());
		}

		{
			var regExp = /([0-9])[\s]*bed[\s]*room[\s]*([\S\s]*)\sfor\ssale$/i;
			var match = regExp.exec(type);

			if(match) {
				number = parseInt(match[1]);
				house = match[2];
			}
		}

		// if(address) {
		// 	geocoder.geocode(address, function ( err, data ) {
	 //  			console.log(JSON.stringify(data));
		// 	});
		// }


		var description = $('.propertyDetailDescription').text().trim();

		var property = {
			"_id" : queueItem.path,
			"price"   : price,
			"number" : number,
			"house" : house,
			"address" : address,
			"type" : type,
			"date" : data[queueItem.path],
			"description" : description
		};

		// console.log(JSON.stringify(property));
		
		

		db.collection('properties', function(error, collection) {
			collection.insert(property, {safe: true}, function(err, result) {
				if(err) {
					console.log("ERROR : " + err);
				} else {
					console.log('Success : ' + JSON.stringify(result[0]));
				}
			});
		});
		

	} else {

		// console.log(responseBuffer.toString());

		$('li.moredetails').each(function(i,elem) {
			
			var agent = $(elem).parentsUntil('div.moreinfo')
						.parent().next().find('p.branchblurb').text();

			var href = $(this).find('a').attr('href');

			if(href) {

				var regExp = /([0-9][0-9]?)\/([0-9][0-9])\/([0-9][0-9][0-9]?[0-9]?)/i;
				var match = regExp.exec(agent);

				var updateDate = new Date();

				if(match && match.length == 4) {
					updateDate = new Date(parseInt(match[3]),parseInt(match[2])-1,parseInt(match[1]));
				}

				data[href] =  updateDate.getTime();

				console.log("DATE :: " + updateDate);
			}

			crawler.queue.add("http",config.baseURL,parseInt(config.port), href);
		});
		
		var href = $('div.slidercontainer').children().last().find('a.pagenavigation').attr('href');

		// console.log("HREF : " +$('div.slidercontainer').children().last().find('a.pagenavigation').attr('href'));
		
		if(href) {
			crawler.queue.add("http",config.baseURL,parseInt(config.port), 
					$('div.slidercontainer').children().last().find('a.pagenavigation').attr('href'));
		}

		crawler.queue.getWithStatus("queued").forEach(function(queueItem) {
   			 console.log("Whoah, the request for %s queued!",queueItem.url);
   		});
	} 
});

crawler.on("complete", function() {
	console.log("done");
	db.close();
});

crawler.start();
