var cheerio = require('cheerio');
var async = require('async');
var couch_url = process.env.DOCSDB_URL || 'http://127.0.0.1:5984';
var nano = require('nano')(couch_url);
var parse_packages = require('../lib/parse_packages');
var seq = require('../lib/seq');

function add_tv_links(tv, $, main_callback) {

    var name = tv + ":" + $('topic').text();

    // Need to get the current doc from the DB,
    // to know what has been removed

    var tv_db = nano.db.use('task-view');
    var pkg_db = nano.db.use('task-view-pkgs');

    tv_db.get(tv, function(err, old) {
	if (err) {
	    if (err.statusCode == 404) {
		var old_pkg = [];
	    } else {
		return err;
	    }
	} else {
	    var old_pkg = old.html.packagelist;
	}

	var new_pkg = parse_packages($);

	var to_add = new_pkg.filter(function(i) {
	    return old_pkg.indexOf(i) < 0; });
	var to_del = old_pkg.filter(function(i) {
	    return new_pkg.indexOf(i) < 0; });

	var i = 0;

	seq(new_pkg, function(pkg, callback) {
	    pkg_db.get(pkg, function(error, body) {
		var update = false;
		if (error) {
		    update = true;
		    var body = { 'task_views': [ name ],
				 '_id': pkg };
		} else if (body.task_views.indexOf(name) < 0) {
		    update = true;
		    body.task_views.push(name);
		}
		if (update) {
		    console.log("Adding ", pkg, " to ", tv);
		    pkg_db.insert(body, pkg, callback);
		    return;
		} else {
		    callback(null);
		    return;
		}
	    })
	})

	seq(to_del, function(pkg, callback) {
	    pkg_db.get(pkg, function(error, body) {
		var update = false;
		if (error) {
		    update = true;
		    body = { 'task_views': [ ],
			     '_id': pkg };
		} else if (body.task_views.indexOf(name) >= 0) {
		    update = true;
		    var index = body.task_views.indexOf(name);
		    body.task_views.splice(index, 1);
		}
		if (update) {
		    console.log("Removing ", pkg, " from ", tv);
		    pkg_db.insert(body, pkg, callback);
		} else {
		    callback(null);
		}
		return;
	    })
	})

	main_callback(null);

    })

}

module.exports = add_tv_links;
