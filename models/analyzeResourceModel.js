
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
		header.start_time = format('yyyy-MM-dd hh:mm:00', new Date(resData.duration_time.start));
		header.end_time = format('yyyy-MM-dd hh:mm:00', new Date(resData.duration_time.end));
		let resHead = JSON.parse(JSON.stringify(header));

		// dosen't have any activity name
		if (resHead.activity_name == null) {
			// 다음으로 넘김
			return resolved();
		}
		
		// set activity key which use all tables
		let key;
		AnalyzerModel.getActivityKey(context, resHead)
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
				return resolved();
			})
			.catch(function(err) {
				// Occurred an error by server
	            return rejected(err);
			});
	});
};