var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var express = require('express')
var property = require('./routes/properties');
 
var app = express();

app.use(express.compress());
app.use(express.static(__dirname + '/public'), {maxAge: 20});
app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
app.use(express.bodyParser());
 
app.get('/properties/id/:id', property.findById) 
app.get('/properties/all/:tags', property.findByAllTags);
app.get('/properties/any/:tags', property.findByAnyTag);
app.get('/properties/any/:tags/exclude/:excludes', property.findByAnyTag);
 
app.listen(port, ipaddress);
console.log('Listening on port 3000...');
