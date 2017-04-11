var AnalyzerModel = require('./analyzerModel');

exports.analyzeRender = function(context, header, rendData) {
	return new Promise(function(resolved, rejected) {
		header.activity_name = rendData.activity_name;
		if (rendData.lifecycle_name === "onResume") {
			// 그전에 가지고 있던 onCreate 나 onStart 시간을 가져옴
			let rendHead = JSON.parse(JSON.stringify(header));
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
			AnalyzerModel.getActivityKey(context, rendHead)
				.then(function(result) {
					// get a key
					key = result;
					return new Promise(function(inresolved, inrejected) {
						// increase user count
						AnalyzerModel.insertCount(context, key)
							.then(inresolved)
							.catch(inrejected);
					});
				})
				.then(function() {
					return new Promise(function(inresolved, inrejected) {
						// Add CPU usage
						let total = rendData.os.cpu.user 
								+ rendData.os.cpu.nice 
								+ rendData.os.cpu.system 
								+ rendData.os.cpu.idle;
						let user_rate = (rendData.os.cpu.user/total) * 100;
						AnalyzerModel.insertRender(context, key, user_rate)
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
		} else if (header.lifecycle_name === undefined) {
			// onCreate 나 onStart 일경우 lifecycle start 등록
			header.lifecycle_name = rendData.lifecycle_name;
			header.lifecycle_start = rendData.start_time;

	    	return resolved();
		}
	});
}