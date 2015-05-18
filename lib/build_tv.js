var got = require('got');
var xml2js = require('xml2js');
var parse_xml = xml2js.parseString;

var tv_url = 'http://cran.rstudio.org/web/views/';

function build_tv(entry, callback) {
    var tv = entry.package;

    // Need to get the XML, and create a JSON from it
    var url = tv_url + tv + '.ctv';
    got(url, function (err, data, res) {
	if (err || res.statusCode != 200) { return callback(err); }

	parse_xml(data, function(err, result) {
	    if (err) { return callback(err); }
	    return callback(null, postprocess(result));
	})
    })
}

function postprocess(json) {
    json = json.CRANTaskView;
    json.name = json.name[0];
    json.topic = json.topic[0];
    json.maintainer_email = json.maintainer[0]['$']['email'];
    json.maintainer = json.maintainer[0]['_'];
    json.version = json.version[0];
    json.packagelist = json.packagelist[0];
    json.links = json.links[0];

    var builder = new xml2js.Builder(
	{ 'headless': true,
	  'rootName': 'div' });
    json.info = builder.buildObject(json.info[0])
	.replace(/&#xD/g, '');

    return json;
}

module.exports = build_tv;
