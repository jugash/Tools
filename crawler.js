var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var crawler = new Crawler(config.baseURL, config.query, parseInt(config.port), parseInt(config.retryInterval));

var data = [];

var conditionId = crawler.addFetchCondition(function(parsedURL) {
	return parsedURL.path.match(/house-prices\/detail.html/i);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	
	var $ = Cheerio.load(responseBuffer);
	$("div.soldDetails").each(function(i,e) {
		var address = $(e).find("a").text();
		var recent = $(e).find("table").children().first();
		var children = $(recent).children("td");
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
	console.log(data);
});

crawler.start();
