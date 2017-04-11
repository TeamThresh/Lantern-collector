var AnalyzerModel = require('./analyzerModel');

exports.analyzeCrash = function(context, header, crashData) {
	let isFail = false;
	return new Promise(function(resolved, rejected) {
		// Crash 정보 가져옴
		let crash_info = {
			crash_name : "",
			crash_location : "",
			crash_time : crashData.crash_time
		};
		let crashHead = JSON.parse(JSON.stringify(header));
		
		// TODO stacktrace 의 첫줄에 있는 Exception 이름도 가져와야 함


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
	    		AnalyzerModel.getActivityKey(context, crashHead)
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
					/*if (crash_info.crash_name === "") {
						console.error("Cannot find crash info");
					}*/
					if (isFail) {
		            	// if need rollback remove comment
	    				return rejected(isFail)
			        }
					return resolved();
		        }
			}
			
		});
	});
};