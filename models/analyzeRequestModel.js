var format = require('date-format');
var AnalyzerModel = require('./analyzerModel');

exports.analyzeRequest = function(context, header, requestData) {
	return new Promise(function(resolved, rejected) {
		//set activity name
		let reqHead = JSON.parse(JSON.stringify(header));
		reqHead.start_time = format('yyyy-MM-dd hh:mm:00', 
			new Date(requestData.request_time));
		
		// Get Activity Key
		AnalyzerModel.getVersionKey(context, reqHead)
			.then(function() {
				return AnalyzerModel.getActivityKey(context, reqHead);
			})
			.then(function(act_host_key) {
				return new Promise(function(inresolved, inrejected) {
					// Add host information
					let host = {
    					name : requestData.host,
    					speed : (requestData.response_time - requestData.request_time),
    					status : requestData.status
    				};

					return AnalyzerModel.insertOutboundCall(context, act_host_key, host)
						.then(inresolved)
						.catch(inrejected)
				});
			})
			.then(function() {
				return resolved();
			})
			.catch(function(err) {
				// Occurred an error by server
				return rejected(err);
			});
	});
};
