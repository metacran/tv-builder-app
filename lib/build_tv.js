var cheerio = require('cheerio');
var parse_packages = require('../lib/parse_packages');

function build_tv(tv, $, callback) {

    var json = {};

    json.name = $('name').text();
    json.topic = $('topic').text();
    json.maintainer = $('maintainer').text();
    json.email = $('maintainer').attr('email');
    json.version = $('version').text();
    json.info = $('info').html();
    json.summary = $('info').contents()[0].data.trim() ||
	$('p', 'info').html();
    json.packagelist = parse_packages($);
    json.core = $('packagelist')
	.children()
	.map(function(i, el) {
	    if ($(this).attr('priority') == 'core') { return i; } })
	.get();
    json.links = $('links')
	.children()
	.map(function(i, el) {
	    return cheerio.html($(this));
	}).get();

    store_html(tv, json, callback);
}

function store_html(package, html, callback) {
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

    db.update(doc, package, callback);
}

module.exports = build_tv;
