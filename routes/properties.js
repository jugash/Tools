var mongo = require('mongodb');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var ipaddress = process.env.OPENSHIFT_MONGODB_DB_HOST || "localhost";
var port = process.env.OPENSHIFT_MONGODB_DB_PORT || 27017;
var dbName = process.env.OPENSHIFT_APP_NAME || 'rightmovedb';
var dbUser = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
var dbPass = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;


var server = new Server(ipaddress, port, {auto_reconnect: true});
db = new Db(dbName, server);

db.open(function(err, db) {
    if(err)
        throw err;

    if(typeof dbUser === "undefined") {
        openCollection();
    } else {
        db.authenticate(dbUser, dbPass, {authdb: "admin"}, function(err, result) {
            if(err)
                throw err;
            openCollection();
        });
    }
});


function openCollection() {
    console.log("Connected to %s database", dbName);
    db.collection('properties', {strict:true}, function(err, collection) {
            if (err) {
                console.log("The 'properties' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }
        });
}

exports.findById = function(req, res) {
    var id = req.params.id;
    db.collection('properties', function(err, collection) {
        collection.findOne({'_id': id}, function(err, item) {
            res.send(item);
        });
    });
};

exports.findByAllTags = function(req, res) {
    var tags = req.params.tags.split(',').join('&');
    db.collection('properties', function(err, collection) {
        collection.find({'description' : { '$regex' : tags }}).toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.findByAnyTag = function(req, res) {
    var tags = req.params.tags.split(',').join('|');
    // var excludes = req.params.excludes.split(',').join('|');
    db.collection('properties', function(err, collection) {
        collection.find({'description' : { '$regex' : tags }}).limit(50).toArray(function(err, items) {
            res.send(items);
        });
    });
};
