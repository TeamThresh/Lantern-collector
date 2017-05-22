var format = require('date-format');
var AnalyzerModel = require('../../models/analyzerModel');
var AnalyzeUserModel = require('../../models/analyzeUserModel');

exports.addUserConnect = function(context, header) {
	return new Promise(function(resolved, rejected) {
		let userHeader = JSON.parse(JSON.stringify(header));
		userHeader.connection_time = format('yyyy-MM-dd hh:mm:00', new Date());

		AnalyzerModel
			.getVersionKey(context, userHeader)
			.then(function() {
				return AnalyzeUserModel.insertUserConnection(context, userHeader);
			})
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
