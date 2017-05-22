
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
						trace_array = thread.trace_list;
						for (var i=0;i<trace_array.length;i++) {
							let words = trace_array[i].trace_content.split('(')[0].split('.')
							let funcname = words[words.length-1];
							if (i==0) {
								uplevel_trace_content = null
							} else {
								uplevel_trace_content = trace_array[i-1].trace_content;
							}

							if (i==trace_array.length-1) {
								downlevel_trace_content = null;
							} else {
								downlevel_trace_content = trace_array[i+1].trace_content;
							}

							if (header.thread_trace[key][thread.thread_name][funcname] == undefined) {
								header.thread_trace[key][thread.thread_name][funcname] = [{
									raw : trace_array[i].trace_content,
									count : 1,
									uplevel : uplevel_trace_content,
									downlevel : downlevel_trace_content
								}];
							} else {
								let result = header.thread_trace[key][thread.thread_name][funcname]
									.some(function (item, idx) {
									if (item.raw == trace_array[i].trace_content
									&& item.uplevel == uplevel_trace_content 
									&& item.downlevel == downlevel_trace_content) {
										item.count += 1;
										return true;
									} else {
										return false;
									}
								});

								if (!result) {
									header.thread_trace[key][thread.thread_name][funcname].push({
										raw : trace_array[i].trace_content,
										count : 1,
										uplevel : uplevel_trace_content,
										downlevel : downlevel_trace_content
									});
								}	
							}
						}
						/*
						thread.trace_list.forEach(function(trace, index) {
							console.log("type : " , typeof thread.trace_list[index-1])
							let words = trace.trace_content.split('(')[0].split('.')
							let funcname = words[words.length-1];

							if (header.thread_trace[key][thread.thread_name][funcname] == undefined) {
								header.thread_trace[key][thread.thread_name][funcname] = [{
									raw : trace.trace_content,
									count : 1,
									uplevel : JSON.parse(thread.trace_list[index-1]).trace_content == undefined
									 ? null : JSON.parse(thread.trace_list[index-1]).trace_content
								}];
							} else {
								let result = header.thread_trace[key][thread.thread_name][funcname]
									.some(function (item, idx) {
									if (item.raw == trace.trace_content
									&& item.uplevel == JSON.parse(thread.trace_list[index-1]).trace_content) {
										item.count += 1;
										return true;
									} else {
										return false;
									}
								});

								if (!result) {
									header.thread_trace[key][thread.thread_name][funcname].push({
										raw : trace.trace_content,
										count : 1,
										uplevel : JSON.parse(thread.trace_list[index-1]).trace_content == undefined
										 ? null : JSON.parse(thread.trace_list[index-1]).trace_content
									});
								}	
							}
						});
						*/
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
		console.log("thread_trace : ", thread_trace);
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
							up_stack_name : each_stack.uplevel,
							down_stack_name : each_stack.downlevel
						});

						stackname_array.push([func_name, each_stack.raw]);
					});
				});
			});
		});

		return AnalyzerModel.insertCallstackName(context, stackname_array)
			.then(function() {
				return new Promise(function(inresolved, inrejected) {
					AnalyzerModel.insertCallstack(context, insert_array)
						.then(inresolved)
						.catch(inrejected);
				});
			})
			.then(resolved)
			.catch(rejected);
			
	});
};