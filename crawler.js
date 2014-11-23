var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var geocoder = require('geocoder');

var findURL = "/house-prices/" + process.argv[2] +".html?year=1";

console.log(findURL);
 
var crawler = new Crawler(config.baseURL, config.query, parseInt(config.port), 3000);

var data = [];

var conditionId = crawler.addFetchCondition(function(parsedURL) {
	return parsedURL.path.match(/house-prices\/Slough.html/i);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	
	var $ = Cheerio.load(responseBuffer);
	$("div.soldDetails").each(function(i,e) {
		var address = $(e).find(".soldAddress").text();
		var recent = $(e).find("table").children().first();
		var children = $(recent).children("td");

		// Geocoding
		geocoder.geocode(address, function ( err, data ) {
  			console.log(JSON.stringify(data));
		});

		var row = {
			"Address"  : address,
			"SoldPrice" : $(children[0]).text(),
			"SoldType"  : $(children[1]).text(),
			"SoldDate"  : $(children[2]).text(),
			"NoBedRooms" : $(children[3]).text()
		}

		data.push(row);
	});


});


crawler.on("complete", function() {
	// console.log(data);
});

crawler.start();
