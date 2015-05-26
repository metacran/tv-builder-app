
function seq(arr, func) {

    var results = [];

    var step = function(x) {
	if (x < arr.length) {
	    func(arr[x], function(error, result) {
		if (error) { return(error); }
		results.push(result);
		step(x + 1);
	    });
	}

	return results;
    }

    return step(0);
}

module.exports = seq;
