var format = require('date-format');
var AnalyzerModel = require('../../models/analyzerModel');
var AnalyzeCrashModel = require('../../models/analyzeCrashModel');

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

				let key;
				// Crash 정보 DB 저장
				AnalyzerModel.getVersionKey(context, crashHead)
					.then(function() {
						return AnalyzerModel.getActivityKey(context, crashHead);
					})
					.then(function(result) {
						key = result;
						// insert crash info
						return AnalyzeCrashModel.insertCrashName(context, crashHead, crashData);
					})
					.then(function() {
						// insert crash info
						return AnalyzeCrashModel.insertCrash(context, key, crashData)
					})
					.then(function() {
						return AnalyzeCrashModel.insertEventPath(context, crashData);
					})
					.then(function() {
						return AnalyzeCrashModel.insertPathLink(context, crashData);
					})
					.then(function() {
						// Callstack saving
						return new Promise(function(inresolved, inrejected) {
							if (crashData.save_trace == undefined)
								crashData.save_trace = {};
							crashData.thread_trace.forEach(function(thread) {
								if (crashData.save_trace[thread.thread_name] == undefined)
									crashData.save_trace[thread.thread_name] = {};

								thread.trace_list.forEach(function(trace, index) {
									let words = trace.split('(')[0].split('.')
									let funcname = words[words.length-1];
									if (index==0) {
										uplevel_trace_content = null
									} else {
										uplevel_trace_content = trace_array[index-1];
									}

									if (index==trace_array.length-1) {
										downlevel_trace_content = null;
									} else {
										downlevel_trace_content = trace_array[index+1];
									}

									if (crashData.save_trace[thread.thread_name][funcname] == undefined) {
										crashData.save_trace[thread.thread_name][funcname] = [{
											raw : trace,
											count : 1,
											uplevel : uplevel_trace_content,
											downlevel : downlevel_trace_content
										}];
									} else {
										let result = crashData.save_trace[thread.thread_name][funcname]
											.some(function (item, idx) {
											if (item.raw == trace
											&& item.uplevel == uplevel_trace_content 
											&& item.downlevel == downlevel_trace_content) {
												item.count += 1;
												return true;
											} else {
												return false;
											}
										});

										if (!result) {
											crashData.save_trace[thread.thread_name][funcname].push({
												raw : trace,
												count : 1,
												uplevel : uplevel_trace_content,
												downlevel : downlevel_trace_content
											});
										}	
									}
								});
							});

							return inresolved();
						});
					})
					.then(function() {
						let insert_array = [];
						let stackname_array = [];

						let thread_name_list = Object.keys(crashData.save_trace);
						thread_name_list.forEach(function(thread_name) {
							let func_name_list = Object.keys(crashData.save_trace[thread_name]);
							func_name_list.forEach(function(func_name) {
								crashData.save_trace[thread_name][func_name].forEach(function(each_stack) {
									insert_array.push({
										each_array : [crashData.crash_id, thread_name,
											each_stack.count],
										stack_name : each_stack.raw,
										up_stack_name : each_stack.uplevel,
										down_stack_name : each_stack.downlevel
									});

									stackname_array.push([func_name, each_stack.raw]);
								});
							});
						});

						return require('../../models/analyzeResourceModel').insertCallstackName(context, stackname_array)
							.then(function() {
								
								return AnalyzeCrashModel.insertCrashStack(context, insert_array)
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
			crash_location = crash_location.split(")")[0];

			return callback(null, crash_name, crash_location);
		} else if (index == stacktraceList.length-1) {
			// Crash는 발생했으나 Caused by가 없는 경우
			let exceptionName = stacktraceList[0].split(":")[0];
			let crash_name = exceptionName.trim();
			// crash 위치 찾기
			let crash_location = stacktraceList[1].split("(")[1];
			crash_location = crash_location.split(")")[0];

			return callback(null, crash_name, crash_location);
		}
	}
	return callback(0);
}
