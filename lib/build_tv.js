var got = require('got');
var cheerio = require('cheerio');

var tv_url = 'http://cran.rstudio.org/web/views/';

function build_tv(entry, callback) {
    var tv = entry.package;

    // Need to get the XML, and create a JSON from it
    var url = tv_url + tv + '.ctv';
    got(url, function (err, data, res) {
	if (err || res.statusCode != 200) { return callback(err); }

	var $ = cheerio.load(data);

	var json = {};

	json.name = $('name').text();
	json.topic = $('topic').text();
	json.maintainer = $('maintainer').text();
	json.email = $('maintainer').attr('email');
	json.version = $('version').text();
	json.info = $('info').html();
	json.summary = $('info').contents()[0].data.trim() ||
	    $('p', 'info').html();
	json.packagelist = $('packagelist')
	    .children()
	    .map(function(i, el) { return $(this).text(); })
	    .get();
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

	callback(err, json);
    })
}

module.exports = build_tv;
