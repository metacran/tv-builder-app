var debug = require('debug');
var build_tv = require('./lib/build_tv');
var amqp = require('amqplib');

function run() {

    var broker_url = process.env.RABBITMQ_URL || 'amqp://localhost';
    var q = 'task-view';

    amqp.connect(broker_url).then(function(conn) {
	process.once('SIGINT', function() { conn.close(); });
	return conn.createChannel().then(function(ch) {
	    var ok = ch.assertQueue(q, {durable: true});
	    ok = ok.then(function() { ch.prefetch(1); });
	    ok = ok.then(function() {
		ch.consume(q, doWork, {noAck: false});
	    });
	    return ok;

	    function doWork(msg) {
		var msg_obj = JSON.parse(msg.content.toString());
		console.log(msg_obj.package + " start.");

		build_tv(msg_obj, function(error, html) {
		    if (!error) {
			if (html != "") {
			    store_html(msg_obj.package, html);
			}
			console.log(msg_obj.package + " done.");
		    } else {
			console.log(msg_obj.package + ' error.');
		    }
		    ch.ack(msg);
		});
	    }
	})
    }).then(null, console.warn);
}

function store_html(package, html) {
    var couch_url = process.env.DOCSDB_URL || 'http://127.0.0.1:5984';
    var nano = require('nano')(couch_url);
    var db = nano.db.use('task-view');
    var doc = { 'date': new Date().toISOString(),
		'html': html };

    db.update = function(obj, key, callback) {
	var db = this;
	db.get(key, function (error, existing) {
	    if(!error) obj._rev = existing._rev;
	    db.insert(obj, key, callback);
	});
    }

    db.update(doc, package, function(error, response) {
	if (error) { return console.log(error); }
    });
}

module.exports = run;
