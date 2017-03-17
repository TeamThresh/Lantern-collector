/**
 * Created by YS on 2017-03-13.
 */
var mysqlSetting = require('./mysqlSetting');

/**
 * To dump client resource data into Analysis Database
 * @param obj - Validated resource
 * @param callback(err)
 */
exports.saveAnalysisDump = function(obj, callback) {
	var isFail = false;
	// Set head infomation of resource
	var date = new Date();
	var header = {
		app_name : obj.package_name,
		os_ver : obj.device_info.os,
		app_ver : obj.device_info.app,
		device_name : obj.device_info.device,
		today : date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()
	};

	mysqlSetting.getPool()
        .then(mysqlSetting.getConnection)
        .then(mysqlSetting.connBeginTransaction)
        .then(function(context) {
        	// start analyzing
        	return new Promise(function(resolved, rejected) {
        		obj.data.forEach(function(arr, index) {
        			console.log(arr.type);
        			// switch each array object's type
			    	switch(arr.type) {
			    		case "res": // Analyze resource
			    			//set activity name
			    			let stack_length
			    			arr.app.activity_stack.length == 0 
			    				? stack_length = 0 
			    				: stack_length = arr.app.activity_stack.length-1;
			        		header.activity_name = arr.app.activity_stack[stack_length];

			        		// dosen't have any activity name
			        		if (header.activity_name == null) {
			        			console.log("break!");
					            if (index == obj.data.length-1) {
					            	context.connection.rollback();
					            	mysqlSetting.releaseConnection(context);
					            	var error = new Error("wrong activity name");
						            error.status = 400;
						            console.error(error);
			        				return rejected(error);
						        }
			        			break;
			        		}
			        		
			        		// set activity key which use all tables
			        		let key;
			        		getActivityKey(context, header)
			        			.then(function(result) {
			        				// get a key
			        				key = result;
			        				return new Promise(function(inresolved, inrejected) {
			        					// increase user count
			        					insertCount(context, key)
			        						.then(inresolved)
			        						.catch(inrejected);
			        				});
			        			})
			        			.then(function() {
			        				console.log("insert count 되기도 전에 문제다");
			        				return new Promise(function(inresolved, inrejected) {
			        					// Add CPU usage
			        					let total = arr.os.cpu.user 
			        							+ arr.os.cpu.nice 
			        							+ arr.os.cpu.system 
			        							+ arr.os.cpu.idle;
			        					let user_rate = (arr.os.cpu.user/total) * 100;
			        					insertCPU(context, key, user_rate)
			        						.then(inresolved)
			        						.catch(inrejected)
			        				});
			        			})
			        			.then(function() {
			        				console.log("cpu 이후가 문제다");
			        				// Add Memory usage
			        				return new Promise(function(inresolved, inrejected) {
			        					let mem_rate = arr.app.memory.alloc/arr.app.memory.max;
			        					insertMemory(context, key, mem_rate)
			        						.then(inresolved)
			        						.catch(inrejected);
			        				});
			        			})
			        			.then(function() {
			        				console.log("res 부분은 문제가 아니다");
			        				// Check forEach loop whether last or not
					        		if (index == obj.data.length-1) {
				        				return resolved(context);
							        }
			        			})
			        			.catch(function(err) {
			        				// Occurred an error by server
					            	context.connection.rollback();
					            	mysqlSetting.releaseConnection(context);
						            var error = new Error(err);
						            error.status = 500;
						            console.error(err);
						            isFail = error;
						            if (index == obj.data.length-1) {
						            	// if need rollback remove comment
                						//context.connection.rollback();
				        				return rejected(isFail)
							        }
			        			});
			        		break;
	        			case "render": // Analyze rendering data
					    	header.activity_name = arr.activity_name;
					    	// TODO
					    	if (index == obj.data.length-1) {
		        				return resolved(context);
					        }
					    	break;
	        			case "crash": // Analyze crash info
	        				console.log("crash 까지 왔다");
	        				// Crash 정보 가져옴
							let crash_info = {
	        					crash_name : "",
	        					crash_activity : header.activity_name,
	        					crash_location : "",
	        					crash_time : arr.crash_time
	        				};
	        				
	        				console.log(arr);
	        				let stacktraceList = arr.stacktrace.split("\n");
	        				// Stacktrace 를 돌면서 Crash 이름, 위치 찾음
	        				stacktraceList.forEach(function(line, index) {
	        					// Cuased by 추출 (crash 이름, 위치)
	        					let compareWord = line.slice(0, 9);
	        					console.log("힝2");
	        					if (compareWord === "Caused by") {
	        						let splitedLine = line.split(":");
	        						crash_info.crash_name = splitedLine[1].trim();
	        						crash_info.crash_location = stacktraceList[index+1]
	        							.trim()	// 좌우 공백 제거
	        							.split(" ")[1];	// at 제거
console.log("실행");
			        				// Crash 정보 DB 저장
									insertCrash(context, key, crash_info)
		        						.then(function() {
					        				if (index == obj.data.length-1) {
						        				return resolved(context);
									        }
		        						})
		        						.catch(function(err) {
		        							// Occurred an error by server
		        							console.log("여기?");
							            	context.connection.rollback();
							            	mysqlSetting.releaseConnection(context);
								            var error = new Error(err);
								            error.status = 500;
								            console.error(error);
								            isFail = error;
								            if (index == obj.data.length-1) {
								            	// if need rollback remove comment
		                						//context.connection.rollback();
						        				return rejected(isFail)
									        }
		        						});
	        					} else {
	        						if (index == obj.data.length-1) {
	        							// Crash는 발생했으나 parsing 실패한경우
	        							if (crash_info.crash_name === "") {
	        								console.error("Cannot find crash info");
	        							}
		        						return resolved(context);
							        }
	        					}
	        					
	        				});
					        break;
	        				// TODO
	        			case "request": // Analyze network outbound call
	        				// TODO
	        				if (index == obj.data.length-1) {
		        				return resolved(context);
					        }
					        break;
	        		}
	        	});
	        	
        	})
        })
	    .then(mysqlSetting.commitTransaction)
	    .then(function(data) {
	        return callback(null);
	    })
    	.catch(function(err) {
	        return callback(err);
	    });
};

/**
 * Get Activities key in Database
 * @param context - To get mysql connection on this object
 * @param header - To get resource informations
 * @return Promise
 */
var getActivityKey = function(context, header) {
	return new Promise(function(resolved, rejected) {
		var select = [header.app_name, header.activity_name,
			header.os_ver, header.app_ver, 
			header.device_name, header.today];
        var sql = "SELECT act_id " +
            "FROM activity_table " +
            "WHERE `app_name` = ? " +
            "AND `activity_name` = ? " +
            "AND `os_ver` = ? " +
            "AND `app_ver` = ? " +
            "AND `device_name` = ? " +
            "AND `date` = ?";
        context.connection.query(sql, select, function (err, rows) {
        	var key;
            if (err) {
                var error = new Error("db failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            } else if (rows.length == 0) {
            	newActivity(context, header)
            		.then(function(result) {
            			key = result;
            			return resolved(key);
            		})
            		.catch(rejected);
            } else {
            	key = rows[0].act_id;
            	return resolved(key);
            }
        });
    });
};

/**
 * Make Activities key in Database
 * @param context - To get mysql connection on this object
 * @param header - To get resource informations
 * @return Promise
 */
var newActivity = function(context, header) {
	return new Promise(function(resolved, rejected) {
		var insert = [header.app_name, header.activity_name,
			header.os_ver, header.app_ver, 
			header.device_name, header.today];
		var sql = "INSERT INTO activity_table SET " +
            "`app_name` = ?, " +
            "`activity_name` = ?, " +
            "`os_ver` = ?, " +
            "`app_ver` = ?, " +
            "`device_name` = ?, " +
            "`date` = ?";
        context.connection.query(sql, insert, function (err, rows) {
        	var key;
            if (err) {
                var error = new Error("db failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            } else if (rows.insertId) {
            	key = rows.insertId;
            }
			console.log("ROWS");
			console.log(rows);
            //context.connection.release();
            return resolved(key);
        });
    });
};

/**
 * Increase user count of the Activity
 * @param context - To get mysql connection on this object
 * @param key - Resource Key
 * @return Promise
 */
var insertCount = function(context, key) {
	return new Promise(function(resolved, rejected) {
		console.log("insert count 에서 문제다");
		var update = [key];
        var sql = "UPDATE activity_table SET " +
            "`user_count` = `user_count` + 1 " +
            "WHERE `act_id` = ? ";
        context.connection.query(sql, update, function (err, rows) {
        	console.log(rows);
            if (err) {
                var error = new Error("insert failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            //context.connection.release();
            return resolved();
        });
    });
};

/**
 * Add CPU usage of the Activity
 * @param context - To get mysql connection on this object
 * @param key - Resource Key
 * @param rate - CPU usage rate
 * @return Promise
 */
var insertCPU = function(context, key, rate) {
	return new Promise(function(resolved, rejected) {
		var insert = [key, rate, rate];
        var sql = "INSERT INTO cpu_table SET " +
            "`act_cpu_id` = ?, " +
            "`cpu_sum` = ?, " +
            "`cpu_count` = 1 " +
            "ON DUPLICATE KEY UPDATE " +
            "`cpu_sum` = `cpu_sum` + ?, " +
            "`cpu_count` = `cpu_count` + 1";
        context.connection.query(sql, insert, function (err, rows) {
            if (err) {
                var error = new Error("insert failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            //context.connection.release();
            return resolved();
        });
    });
};

/**
 * Add Memory usage of the Activity
 * @param context - To get mysql connection on this object
 * @param key - Resource Key
 * @param rate - Memory usage rate
 * @return Promise
 */
var insertMemory = function(context, key, rate) {
	return new Promise(function(resolved, rejected) {
		var insert = [key, rate, rate];
        var sql = "INSERT INTO memory_table SET " +
        	"`act_mem_id` = ?, " +
            "`mem_sum` = ?, " +
            "`mem_count` = 1 " +
            "ON DUPLICATE KEY UPDATE " +
            "`mem_sum` = `mem_sum` + ?, " +
            "`mem_count` = `mem_count` + 1";
        context.connection.query(sql, insert, function (err, rows) {
            if (err) {
                var error = new Error("insert failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            //context.connection.release();
            return resolved();
        });
    });
};
/*
var insertOutboundCall = function(context, key, rate) {
	return new Promise(function(resolved, rejected) {
		var insert = [rate, key, rate];
        var sql = "INSERT INTO memory_table SET " +
            "`mem_sum` = ?, " +
            "`mem_count` = 1 " +
            "WHERE `act_mem_id` = ? " +
            "ON DUPLICATE KEY UPDATE " +
            "`mem_sum` = `mem_sum` + ?, " +
            "`mem_count` = `mem_count` + 1";
        context.connection.query(sql, insert, function (err, rows) {
            if (err) {
                context.connection.release();
                var error = new Error("insert failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }

            context.connection.release();
            return resolved(context, key);
        });
};*/

/**
 * asdadasdasd
 * @param context - To get mysql connection on this object
 * @param key - Resource Key
 * @param rate - CPU usage rate
 * @return Promise
 */
var insertCrash = function(context, key, crash_info) {
	return new Promise(function(resolved, rejected) {
		var insert = [key, crash_info.crash_name, crash_info.crash_location,
					crash_info.crash_time, crash_info.crash_time, crash_info.crash_time];
        var sql = "INSERT INTO crash_table SET " +
            "`act_crash_id` = ?, " +
            "`crash_name` = ?, " +
            "`crash_location` = ?, " +
            "`first_time` = ?, " +
            "`last_time` = ?, " +
            "`crash_count` = 1 " +
            "ON DUPLICATE KEY UPDATE " +
            "`last_time` = ?, " +
            "`crash_count` = `crash_count` + 1";
            console.log(sql);
        context.connection.query(sql, insert, function (err, rows) {
            if (err) {
                var error = new Error("insert failed");
                error.status = 500;
                console.error(err);
                return rejected(error);
            }
console.log(rows);
            //context.connection.release();
            return resolved();
        });
    });
};