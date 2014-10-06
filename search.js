var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var crawler = new Crawler(config.baseURL, config.find, parseInt(config.port), parseInt(config.retryInterval));

var conditionId = crawler.addFetchCondition(function(parsedURL) {
	return (parsedURL.uriPath.match(/^\/property-for-sale\/find.html/i) 
			|| parsedURL.uriPath.match(/^\/property-for-sale\/property-[0-9]*.html/i))
			&& !parsedURL.path.match(/locationIdentifier=/i);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	
	if(queueItem.path.match(/^\/property-for-sale\/property-[0-9]*.html/i)) {
		
		var $ = Cheerio.load(responseBuffer);
		var description = $('.propertyDetailDescription').text();
		console.log("Property found : " + queueItem.url);
		console.log(description);
	} 
});

crawler.on("complete", function() {
	console.log("done");
});

crawler.start();
