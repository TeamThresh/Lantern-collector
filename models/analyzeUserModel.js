var format = require('date-format');
var AnalyzerModel = require('./analyzerModel');

exports.addUserConnect = function(context, header) {
	return new Promise(function(resolved, rejected) {
		let user_info = {
			uuid : header.uuid,
			app_name : header.app_name,
			connection_time : format('yyyy-MM-dd hh:mm:00', 
				new Date())
		};

		AnalyzerModel.insertUserConnection(context, user_info)
			.then(function(retention) {
				// 복귀 유저 여부 반환
				return resolved(retention);
			})
			.catch(function(err) {
				// Occurred an error by server
	            return rejected(err);
			});
	});
}
