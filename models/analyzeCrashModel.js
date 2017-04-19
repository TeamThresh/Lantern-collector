var format = require('date-format');
var AnalyzerModel = require('./analyzerModel');

exports.analyzeCrash = function(context, header, crashData) {
	let isFail = false;
	return new Promise(function(resolved, rejected) {
		// Crash 정보 가져옴
		let crashHead = JSON.parse(JSON.stringify(header));
		crashHead.start_time = format('yyyy-MM-dd hh:mm:00', 
				new Date(crashData.crash_time));
		
		// stacktrace 의 첫줄에 있는 Exception 이름도 가져와야 함
		extractCrashInfo(crashData.stacktrace, 
			function(err, crash_name, crash_location) {
				if (err) return rejected("Crash info parsing error");
				crashData.crash_name = crash_name;
				crashData.crash_location = crash_location;

				// Crash 정보 DB 저장
				AnalyzerModel.getVersionKey(context, crashHead)
					.then(function() {
						return AnalyzerModel.getActivityKey(context, crashHead);
					})
					.then(function(key) {
						// get a key
						return new Promise(function(inresolved, inrejected) {
							// insert crash info
							AnalyzerModel.insertCrash(context, key, crashData)
								.then(inresolved)
								.catch(inrejected);
						});
					})
					.then(function() {
						if (isFail) {
			            	// if need rollback remove comment
	        				return rejected(isFail)
				        }
	    				return resolved();
					})
					.catch(function(err) {
						// Occurred an error by server
		            	return rejected(err);
					});
			});

		/*
		// Stacktrace 에서 Caused by가 있는 것 찾기
		let stacktraceList = crashData.stacktrace.split("\n");
		// Stacktrace 를 돌면서 Crash 이름, 위치 찾음
		stacktraceList.forEach(function(line, in_index) {
			// Cuased by 추출 (crash 이름, 위치)
			let compareWord = line.slice(0, 9);

			if (compareWord === "Caused by") {
				let splitedLine = line.split(":");
				crash_info.crash_name = splitedLine[1].trim();
				crash_info.crash_location = stacktraceList[in_index+1]
					.trim()	// 좌우 공백 제거
					.split(" ")[1];	// at 제거

				// Crash 정보 DB 저장
	    		AnalyzerModel.getVersionKey(context, crashHead)
	    			.then(function() {
						return AnalyzerModel.getActivityKey(context, crashHead);
					})
	    			.then(function(key) {
	    				// get a key
	    				return new Promise(function(inresolved, inrejected) {
	    					// insert crash info
	    					AnalyzerModel.insertCrash(context, key, crash_info)
	    						.then(inresolved)
	    						.catch(inrejected);
	    				});
	    			})
	    			.then(function() {
	    				if (in_index == stacktraceList.length-1) {
	    					if (isFail) {
				            	// if need rollback remove comment
		        				return rejected(isFail)
					        }
	        				return resolved();
				        }
					})
					.catch(function(err) {
						// Occurred an error by server
						isFail = err;
			            if (in_index == stacktraceList.length-1) {
			            	return rejected(err);
			        	}
					});
			} else {
				if (in_index == stacktraceList.length-1) {
					// Crash는 발생했으나 parsing 실패한경우
					if (isFail) {
		            	// if need rollback remove comment
	    				return rejected(isFail)
			        }
					return resolved();
		        }
			}
			
		});
		*/
	});
};

function extractCrashInfo(stacktrace, callback) {
	// Stacktrace 에서 crash 이름 찾기
	let stacktraceList = stacktrace.split("\n");
	
	// Stacktrace 를 돌면서 Crash 이름, 위치 찾음
	for (var index = 0; index <= stacktraceList.length-1; index++) {
		// Cuased by 추출 (crash 이름, 위치)
		let compareWord = stacktraceList[index].slice(0, 9);

		if (compareWord === "Caused by") {
			// Caused by가 있는 경우
			let splitedLine = stacktraceList[index].split(":");
			let crash_name = splitedLine[1].trim();
			// crash 위치 찾기
			let crash_location = stacktraceList[index+1].split("(")[1];
			crash_location = crash_location.split(".java")[0];

			return callback(null, crash_name, crash_location);
		} else if (index == stacktraceList.length-1) {
			// Crash는 발생했으나 Caused by가 없는 경우
			let exceptionName = stacktraceList[0].split(":")[0];
			let crash_name = exceptionName.trim();
			// crash 위치 찾기
			let crash_location = stacktraceList[1].split("(")[1];
			crash_location = crash_location.split(".java")[0];

			return callback(null, crash_name, crash_location);
		}
	}
	return callback(0);
}
