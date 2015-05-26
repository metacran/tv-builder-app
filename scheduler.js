var debug = require('debug');
var amqp = require('amqplib');
var got = require('got');
var cheerio = require('cheerio');
var async = require('async');
var build_tv = require('./lib/build_tv');
var add_tv_links = require('./lib/add_tv_links');

var tv_url = 'http://cran.rstudio.org/web/views/';

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

		// Get the doc
		var tv = msg_obj.package;
		var url = tv_url + tv + '.ctv';
		got(url, function (err, data, res) {
		    if (err || res.statusCode != 200) {
			console.log(tv + ' error.');
			ch.ack(msg);
			return;
		    }

		    var $ = cheerio.load(data);

		    // We can't run this in parallel, because 'links' needs
		    // the old version of the TV from the DB, so we can't update
		    // it in 'doc' until it gets that
		    async.series(
			{
			    'links': function(cb) {
				add_tv_links(tv, $, function(e, r) { cb(e, r) }) },
			    'doc': function(cb) {
				build_tv(tv, $, function(e, r) { cb(e, r) }) }
			},
			function(error, results) {
			    if (error) {
				console.log(tv + ' error.');
			    } else {
				console.log(tv + ' done.');
			    }
			    ch.ack(msg)
			})
		})
	    }
	})
    }).then(null, console.warn);
}

module.exports = run;
