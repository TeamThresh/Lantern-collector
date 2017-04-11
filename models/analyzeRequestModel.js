var AnalyzerModel = require('./analyzerModel');

exports.analyzeRequest = function(context, header, requestData) {
	return new Promise(function(resolved, rejected) {
		//set activity name
		let reqHead = JSON.parse(JSON.stringify(header));
		
		// Get Activity Key
		AnalyzerModel.getActivityKey(context, reqHead)
			.then(function(act_host_key) {
				return new Promise(function(inresolved, inrejected) {
					// Add CPU usage
					let host = {
    					name : requestData.host,
    					speed : (requestData.response_time - requestData.request_time),
    					status : 200 // TODO 데이터 셋에서 추가할 것
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