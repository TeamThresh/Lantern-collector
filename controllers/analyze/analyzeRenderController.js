var format = require('date-format');
var AnalyzerModel = require('../../models/analyzerModel');
var AnalyzeRenderModel = require('../../models/analyzeRenderModel');

exports.analyzeRender = function(context, header, rendData) {
	return new Promise(function(resolved, rejected) {
		// onResume 일 경우 저장 작업 시작
		if (rendData.lifecycle_name === "onResume") {
			// 최상위 액티비티 변경
			header.activity_name = rendData.activity_name;
			let rendHead = JSON.parse(JSON.stringify(header));
			rendHead.start_time = format('yyyy-MM-dd hh:mm:00', 
				new Date(rendData.start_time));
			
			// 그전에 가지고 있던 onCreate 나 onStart 시간을 가져옴
			if (rendHead.lifecycle_start === undefined) {
				rendHead.lifecycle_start = rendData.start_time;
				rendHead.lifecycle_end = rendData.end_time;
			} else {
				rendHead.lifecycle_end = rendData.end_time;
			}

			// 저장되있는 start 값 초기화
			header.lifecycle_name = undefined;
			header.lifecycle_start = undefined;

			// set activity key which use all tables
			let key;
			AnalyzerModel.getVersionKey(context, rendHead)
				.then(function() {
					return AnalyzerModel.getActivityKey(context, rendHead);
				})
				.then(function(result) {
					// get a key
					key = result;
					
					// increase user count
					return AnalyzerModel.insertCount(context, key, header.retention)
				})
				.then(function() {
					if (rendHead.before_activity === undefined) {
						return Promise.resolved;
					}
					// Add activity link
					return AnalyzeRenderModel.insertLink(context, key, rendHead);
				})
				.then(function() {
					// Add UI Rendering Speed
					rendHead.ui_speed = rendHead.lifecycle_end - rendHead.lifecycle_start;
					
					return AnalyzeRenderModel.insertRender(context, key, rendHead)
				})
				.then(function() {
					// link 계산을 위해 before key를 저장
					header.before_activity = key;
					return resolved();
				})
				.catch(function(err) {
					// Occurred an error by server
		            return rejected(err);
				});
		} else if (header.lifecycle_name === undefined) {
			// onCreate 나 onStart 일경우 lifecycle start 등록
			header.lifecycle_name = rendData.lifecycle_name;
			header.lifecycle_start = rendData.start_time;

	    	return resolved();
		} else {
			return resolved();
		}
	});
}
