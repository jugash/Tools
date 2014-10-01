var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var crawler = new Crawler(config.baseURL, config.find, parseInt(config.port), parseInt(config.retryInterval));

// console.log(config);

var conditionId = crawler.addFetchCondition(function(parsedURL) {
	return parsedURL.path.match(/^property-for-sale\/Slough.html/i) 
	|| parsedURL.path.match(/^property-for-sale\/property-/i);
});

crawler.on("queueduplicate", function(queueItem) {
	console.log("QueueItem : " + queueItem.url);
});


crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	// console.log(response);

	if(queueItem.path.match(/property-for-sale\/property-/i)) {
		console.log("Property found : " + queueItem.url);
	} else {
		console.log("Next Page : " + queueItem.url);
	}
});


crawler.on("complete", function() {
	console.log("done");
});

crawler.start();
