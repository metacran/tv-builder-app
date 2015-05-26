var cheerio = require('cheerio');

function parse_packages($) {
    return $('packagelist')
	.children()
	.map(function(i, el) { return $(this).text(); })
	.get();
}

module.exports = parse_packages;
