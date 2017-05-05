
var format = require('date-format');
var AnalyzerModel = require('./analyzerModel');

exports.analyzeResource = function(context, header, resData) {
	return new Promise(function(resolved, rejected) {
		//set activity name
		let stack_length
		resData.app.activity_stack.length == 0 
			? stack_length = 0 
			: stack_length = resData.app.activity_stack.length-1;
		header.activity_name = resData.app.activity_stack[stack_length];
		let resHead = JSON.parse(JSON.stringify(header));
		resHead.start_time = format('yyyy-MM-dd hh:mm:00', 
			new Date(resData.duration_time.start));
		resHead.end_time = format('yyyy-MM-dd hh:mm:00', 
			new Date(resData.duration_time.end));

		// dosen't have any activity name
		if (resHead.activity_name == null) {
			// 다음으로 넘김
			return resolved();
		}
		
		// set activity key which use all tables
		let key;
		AnalyzerModel.getVersionKey(context, resHead)
			.then(function() {
				return AnalyzerModel.getActivityKey(context, resHead);
			})
			.then(function(result) {
				// get a key
				key = result;
				return Promise.resolved;
			})
			.then(function() {
				return new Promise(function(inresolved, inrejected) {
					// Add CPU usage
					let total = resData.os.cpu.user 
							+ resData.os.cpu.nice 
							+ resData.os.cpu.system 
							+ resData.os.cpu.idle;
					let user_rate = (resData.os.cpu.user/total) * 100;
					// TODO 저장되는 Raw의 %를 몇 %로 할꺼냐 정할 것
					// Math.floor() : 소수점 버림, 정수형 반환
					// Math.round() : 소수점 반올림, 정수형 반환
					// 소수점 버리고 10 단위로 저장
					let cpu_raw_rate = Math.floor((resData.os.cpu.user/total) * 10) * 10;
					AnalyzerModel.insertCPU(context, key, user_rate)
						.then(AnalyzerModel.insertCPURaw(context, key, cpu_raw_rate, resHead.start_time))
						.then(inresolved)
						.catch(inrejected)
				});
			})
			.then(function() {
				// Add Memory usage
				return new Promise(function(inresolved, inrejected) {
					let mem_rate = (resData.app.memory.alloc/resData.app.memory.max) * 100;
					// TODO 저장되는 Raw의 %를 몇 %로 할꺼냐 정할 것
					// Math.floor() : 소수점 버림, 정수형 반환
					// Math.round() : 소수점 반올림, 정수형 반환
					// 소수점 버리고 10 단위로 저장
					let mem_raw_rate = Math.floor((resData.app.memory.alloc/resData.app.memory.max) * 10) * 10;
					AnalyzerModel.insertMemory(context, key, mem_rate)
						.then(AnalyzerModel
							.insertMemoryRaw(context, key, mem_raw_rate, resHead.start_time))
						.then(inresolved)
						.catch(inrejected);
				});
			})
			.then(function() {
				// Callstack saving
				return new Promise(function(inresolved, inrejected) {
					if (header.thread_trace == undefined)
						header.thread_trace = {};
					resData.app.thread_trace.forEach(function(thread) {
						if (header.thread_trace[key] == undefined) 
							header.thread_trace[key] = {};
						if (header.thread_trace[key][thread.thread_name] == undefined)
							header.thread_trace[key][thread.thread_name] = {};
						thread.trace_list.forEach(function(trace, index) {
							let words = trace.split('(')[0].split('.')
							let funcname = words[words.length-1];

							if (header.thread_trace[key][thread.thread_name][funcname] == undefined) {
								header.thread_trace[key][thread.thread_name][funcname] = [{
									raw : trace,
									count : 1,
									uplevel : thread.trace_list[index-1] == undefined
									 ? null : thread.trace_list[index-1]
								}];
							} else {
								let result = header.thread_trace[key][thread.thread_name][funcname]
									.some(function (item, idx) {
									if (item.raw == trace
									&& item.uplevel == thread.trace_list[index-1]) {
										item.count += 1;
										return true;
									} else {
										return false;
									}
								});

								if (!result) {
									header.thread_trace[key][thread.thread_name][funcname].push({
										raw : trace,
										count : 1,
										uplevel : thread.trace_list[index-1] == undefined
										 ? null : thread.trace_list[index-1]
									});
								}	
							}
						});
					});

					return inresolved();
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

exports.saveCallstack = function(context, header) {
	return new Promise(function(resolved, rejected) {
		let act_id_list = Object.keys(header.thread_trace);
		let insert_array = [];
		let stackname_array = [];

		act_id_list.forEach(function(act_id) {
			let thread_name_list = Object.keys(header.thread_trace[act_id]);
			thread_name_list.forEach(function(thread_name) {
				let func_name_list = Object.keys(header.thread_trace[act_id][thread_name]);
				func_name_list.forEach(function(func_name) {
					header.thread_trace[act_id][thread_name][func_name].forEach(function(each_stack) {
						insert_array.push({
							each_array : [act_id, thread_name,
								each_stack.count],
							stack_name : each_stack.raw,
							up_stack_name : each_stack.uplevel
						});

						stackname_array.push([func_name, each_stack.raw]);
					});
				});
			});
		});

		return AnalyzerModel.insertCallstackName(context, stackname_array)
			.then(function() {
				return new Promise(function(resolved, rejected) {
					AnalyzerModel.insertCallstack(context, insert_array)
						.then(resolved)
						.catch(rejected);
				});
			})
			.then(resolved)
			.catch(rejected);
			
	});
};