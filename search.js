var Cheerio = require("cheerio");
var Crawler = require("simplecrawler");
var config = require("./config.json");

var stats = {};

var crawler = new Crawler(config.baseURL, config.find, parseInt(config.port), parseInt(config.retryInterval));

crawler.downloadUnsupported=false;
crawler.discoverResources=false;

var conditionId = crawler.addFetchCondition(function(parsedURL) {
	var result =  (parsedURL.uriPath.match(/^\/property-for-sale\/Slough.html/i) 
			|| parsedURL.uriPath.match(/^\/property-for-sale\/property-[0-9]*.html/i))
			&& !parsedURL.path.match(/locationIdentifier=/i);

	return result;
});

crawler.on("fetchstart", function(queueItem) {
	stats[queueItem.path] = new Date().getTime();
	console.log("Fetch Start : " + queueItem.url);
});

crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
	console.log("Fetch Complete : " + queueItem.url + ", time : "  + (new Date().getTime() - stats[queueItem.path]));
	var $ = Cheerio.load(responseBuffer);
	if(queueItem.path.match(/^\/property-for-sale\/property-[0-9]*.html/i)) {
		var description = $('.propertyDetailDescription').text();
		console.log(description);
	} else {

		$('li.moredetails').each(function(i,elem) {
			crawler.queue.add("http",config.baseURL,parseInt(config.port), $(this).find('a').attr('href'));
		});
		
		var href = $('div.slidercontainer').children().last().find('a.pagenavigation').attr('href');

		console.log("HREF : " +$('div.slidercontainer').children().last().find('a.pagenavigation').attr('href'));
		
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
});

crawler.start();
