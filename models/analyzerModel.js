module.exports = {


	/**
	 * Get Version key include package name, os ver, app ver, device name
	 * @param context - To get mysql connection on this object
	 * @param app_info - To get resource informations
	 * @return Promise
	 */
	getVersionKey : function(context, app_info) {
		return new Promise(function(resolved, rejected) {
			var select = [app_info.app_name, app_info.os_ver, 
				app_info.app_ver, app_info.device_name,
				app_info.country_name, app_info.code];
	        var sql = "SELECT ver_id " +
	            "FROM version_table " +
	            "WHERE `package_name` = ? " +
	            "AND `os_ver` = ? " +
	            "AND `app_ver` = ? " +
	            "AND `device_name` = ? " +
	            "AND `location_name` = ? " +
	            "AND `location_code` = ? ";
	        context.connection.query(sql, select, function (err, rows) {
	            if (err) {
	                var error = new Error("db failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            } else if (rows.length == 0) {
	            	require('./analyzerModel')
	            		.newVersion(context, app_info)
	            		.then(function() {
	            			return resolved(context, app_info.ver_key);
	            		})
	            		.catch(rejected);
	            } else {
	            	app_info.ver_key = rows[0].ver_id;
	            	return resolved(context, app_info.ver_key);
	            }
	        });
	    });
	},

	/**
	 * Make Version key in Database
	 * @param context - To get mysql connection on this object
	 * @param app_info - To get resource informations
	 * @return Promise
	 */
	newVersion : function(context, app_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [app_info.app_name, app_info.os_ver, 
				app_info.app_ver, app_info.device_name,
				app_info.country_name, app_info.code];
			var sql = "INSERT IGNORE INTO version_table SET " +
	            "`ver_id` = (SELECT ver_id FROM " +
	            "	(SELECT ver_id " +
				"	FROM version_table " +
				"	ORDER BY ver_id DESC " +
				"	LIMIT 1) tmp)+1, " +
	            "`package_name` = ?, " +
	            "`os_ver` = ?, " +
	            "`app_ver` = ?, " +
	            "`device_name` = ?, " +
	            "`location_name` = ?, " +
	            "`location_code` = ? ";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	            	if (err.code == "ER_DUP_FIELDNAME") {
						return resolved(getVersionKey(context, app_info));
	            	} else {
		                var error = new Error(err.Error);
		                error.status = 500;
		                //console.error(err);
		                return rejected(error);
		            }
	            } else if (rows.insertId) {
	            	app_info.ver_key = rows.insertId;
	            	return resolved();
	            }
	        });
	    });
	},

	/**
	 * Get Activities key in Database
	 * @param context - To get mysql connection on this object
	 * @param app_info - To get resource informations
	 * @return Promise
	 */
	getActivityKey : function(context, app_info) {
		return new Promise(function(resolved, rejected) {
			var select = [app_info.ver_key, app_info.activity_name,
				app_info.start_time];
	        var sql = "SELECT act_id " +
	            "FROM activity_table " +
	            "WHERE `act_ver_id` = ? " +
	            "AND `activity_name` = ? " +
	            "AND `collect_time` = ? ";
	        context.connection.query(sql, select, function (err, rows) {
	            if (err) {
	                var error = new Error("db failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            } else if (rows.length == 0) {
	            	require('./analyzerModel')
	            		.newActivity(context, app_info)
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
	},

	/**
	 * Make Activities key in Database
	 * @param context - To get mysql connection on this object
	 * @param app_info - To get resource informations
	 * @return Promise
	 */
	newActivity : function(context, app_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [app_info.ver_key, app_info.activity_name,
				app_info.start_time];
			var sql = "INSERT INTO activity_table SET " +
	            "`act_ver_id` = ?, " +
	            "`activity_name` = ?, " +
	            "`collect_time` = ? ";
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
	            //context.connection.release();
	            return resolved(key);
	        });
	    });
	},

	/**
	 * Increase user count of the Activity
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param retention - Retention boolean
	 * @return Promise
	 */
	insertCount : function(context, key, retention) {
		return new Promise(function(resolved, rejected) {
			var update = [key];
	        var sql = "UPDATE activity_table SET " +
	            "`user_count` = `user_count` + 1 ";
            if (retention)
            	sql += ",`user_retention_count` = `user_retention_count` + 1 ";
	        sql += "WHERE `act_id` = ? ";
	        
	        context.connection.query(sql, update, function (err, rows) {
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
	},

	/**
	 * Add CPU usage of the Activity
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param rate - CPU usage rate
	 * @return Promise
	 */
	insertCPU : function(context, key, rate) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, rate, rate];
	        var sql = "INSERT INTO cpu_table SET " +
	            "`cpu_act_id` = ?, " +
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
	},

	/**
	 * Add CPU Raw data of the Activity
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param rate - CPU raw data
	 * @param time - Dump time
	 * @return Promise
	 */
	insertCPURaw : function(context, key, rate, time) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, rate, time];
	        var sql = "INSERT INTO cpu_raw_table SET " +
	            "`craw_act_id` = ?, " +
	            "`cpu_raw_rate` = ?, " +
	            "`cpu_raw_count` = 1, " +
	            "`cpu_raw_time` = ? " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`cpu_raw_count` = `cpu_raw_count` + 1";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add Memory usage of the Activity
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param rate - Memory usage rate
	 * @return Promise
	 */
	insertMemory : function(context, key, rate) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, rate, rate];
	        var sql = "INSERT INTO memory_table SET " +
	        	"`mem_act_id` = ?, " +
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
	},

	/**
	 * Add Memory Raw data of the Activity
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param rate - Memory raw data
	 * @param time - Dump time
	 * @return Promise
	 */
	insertMemoryRaw : function(context, key, rate, time) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, rate, time];
	        var sql = "INSERT INTO memory_raw_table SET " +
	            "`mraw_act_id` = ?, " +
	            "`mem_raw_rate` = ?, " +
	            "`mem_raw_count` = 1, " +
	            "`mem_raw_time` = ? " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`mem_raw_count` = `mem_raw_count` + 1";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add out bound call information and increase the count
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param host - Call information
	 * @return Promise
	 */
	insertOutboundCall : function(context, key, host) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, host.name, host.status, 
				host.speed, host.speed, host.speed, 
				host.speed, host.speed, host.speed];
	        var sql = "INSERT INTO obc_table SET " +
	            "`host_act_id` = ?, " +
	            "`host_name` = ?, " +
	            "`host_status` = ?, " +
	            "`host_speed` = ?, " +
	            "`host_high_speed` = ?, " +
	            "`host_low_speed` = ?, " +
	            "`host_count` = 1 " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`host_high_speed` = GREATEST(`host_high_speed`, ?), " +
	            "`host_low_speed` = LEAST(`host_low_speed`, ?), "+
	            "`host_speed` = `host_speed` + ?, " +
	            "`host_count` = `host_count` + 1";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add crash information and increase the count
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param crash_info - Crash information
	 * @return Promise
	 */
	insertCrashName : function(context, key, crash_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [crash_info.crash_name, crash_info.crash_location,
						crash_info.stacktrace, crash_info.crash_time, 
						crash_info.crash_time, crash_info.crash_time];
	        var sql = "INSERT INTO crash_raw_table SET " +
	            "`crash_name` = ?, " +
	            "`crash_location` = ?, " +
	            "`crash_stacktrace` = ?, " +
	            "`first_time` = ?, " +
	            "`last_time` = ? " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`last_time` = ? ";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            } else if (rows.insertId == 0) {
	            	let select = [crash_info.crash_name, crash_info.crash_location]
	            	let sql = "SELECT crash_id FROM crash_raw_table " +
	            		"WHERE `crash_name` = ? " +
	            		"AND `crash_location` = ? ";
	            	context.connection.query(sql, select, function(err, rows) {
	            		if (err) {
			                var error = new Error("insert failed");
			                error.status = 500;
			                console.error(err);
			                return rejected(error);
			            }
	            		crash_info.crash_id = rows[0].crash_id;
		            	return resolved();
	            	});
	            } else {
	            	crash_info.crash_id = rows.insertId;
		            return resolved();
		        }	            
	        });
	    });
	},

	/**
	 * Add crash information and increase the count
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param crash_info - Crash information
	 * @return Promise
	 */
	insertCrash : function(context, key, crash_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, crash_info.crash_id, 
				crash_info.system_service.wifi,
				crash_info.system_service.mobile_network,
				crash_info.system_service.gps,
				crash_info.system_service.wifi,
				crash_info.system_service.mobile_network,
				crash_info.system_service.gps];
	        var sql = `INSERT INTO crash_table SET 
	            crash_act_id = ?, 
	            crash_raw_id = ?, 
	            crash_count = 1, 
	            crash_wifi = ?, 
	            crash_mobile_net = ?,
	            crash_gps = ?
	            ON DUPLICATE KEY UPDATE 
	            crash_count = crash_count + 1,
	            crash_wifi = crash_wifi + ?, 
	            crash_mobile_net = crash_mobile_net + ?,
	            crash_gps = crash_gps + ? `;
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add crash callstack
	 * @param context - To get mysql connection on this object
	 * @param fullarray - All stacktrace count
	 * @return Promise
	 */
	insertCrashStack : function(context, fullarray) {
		return new Promise(function(resolved, rejected) {
			var insert = [];
	        var sql = "INSERT INTO crash_stack_table " +
			"(cs_crash_id, cs_thread_name, cs_count, cs_clevel, " +
			"cs_uplevel) VALUES ";

			let length = fullarray.length - 1;
			fullarray.forEach(function(arr, index) {
				sql += "(?, " +
				"(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?), " +
				"(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?))";
				insert.push(arr.each_array, arr.stack_name, arr.up_stack_name);
				if (index < length) {
					sql += ",";
				}
			});

			sql += "ON DUPLICATE KEY UPDATE " +
				"cs_count = VALUES(cs_count)";

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add Event Path
	 * @param context - To get mysql connection on this object
	 * @param crash_info - Crash information
	 * @return Promise
	 */
	insertEventPath : function(context, crash_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [];
	        var sql = `INSERT IGNORE INTO eventpath_table 
	        	(class_name, method_name, line_num, event_label)
				VALUES `;

			let path_length = crash_info.event_path.length - 1;
			crash_info.event_path.forEach((each, index) => {
				insert.push(each.class_name, each.method_name,
					each.line_num, each.event_label || null);
				sql += "(?, ?, ?, ?) ";
				if (index < path_length) {
					sql += ",";
				}
			});

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }
	            
	            if (rows.insertId == 0)
	            	return resolved(true);
	            return resolved(false);
	        });
	    });
	},

	/**
	 * Add Event path link
	 * @param context - To get mysql connection on this object
	 * @param crash_info - Crash information
	 * @return Promise
	 */
	insertPathLink : function(context, crash_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [];
	        var sql = `INSERT INTO eventpath_crash_table 
	        	(ec_crash_id, ec_event_id, ec_uplevel)
				VALUES `;

			let path_length = crash_info.event_path.length - 1;
			crash_info.event_path.forEach((each, index) => {
				
				insert.push(crash_info.crash_id, 
						each.class_name, each.method_name, each.line_num);
				if (index != 0) {
					insert.push(
						crash_info.event_path[index-1].class_name,
						crash_info.event_path[index-1].method_name,
						crash_info.event_path[index-1].line_num);
				} else {
					insert.push(
						crash_info.event_path[index].class_name,
						crash_info.event_path[index].method_name,
						crash_info.event_path[index].line_num);
				}

				sql += `(?, 
					(SELECT event_id FROM eventpath_table 
						WHERE class_name = ?
						AND method_name = ?
						AND line_num = ?), 
					(SELECT event_id FROM eventpath_table 
						WHERE class_name = ?
						AND method_name = ?
						AND line_num = ?) )`;

				if (index < path_length) {
					sql += ",";
				}
			});

			sql += `ON DUPLICATE KEY UPDATE 
				ec_count = ec_count + 1`;

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }
	            return resolved();
	        });
	    });
	},

	/**
	 * Add rendering information of lifecycle and increase the count
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param render_info - Rendering information
	 * @return Promise
	 */
	insertRender : function(context, key, render_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, render_info.ui_speed, render_info.start_time];
	        var sql = "INSERT INTO ui_table SET " +
	            "`ui_act_id` = ?, " +
	            "`ui_speed` = ?, " +
	            "`ui_count` = 1, " +
	            "`ui_time` = ? " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`ui_count` = `ui_count` + 1";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add link between activities
	 * @param context - To get mysql connection on this object
	 * @param key - Resource Key
	 * @param render_info - Rendering information
	 * @return Promise
	 */
	insertLink : function(context, key, render_info) {
		return new Promise(function(resolved, rejected) {
			var insert = [key, render_info.before_activity];
	        var sql = "INSERT INTO link_table SET " +
	            "`link_act_id` = ?, " +
	            "`before_act_id` = ?, " +
	            "`link_count` = 1 " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`link_count` = `link_count` + 1";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add callstack
	 * @param context - To get mysql connection on this object
	 * @param fullarray - All stacktrace count
	 * @return Promise
	 */
	insertCallstack : function(context, fullarray) {
		return new Promise(function(resolved, rejected) {
			var insert = [];
	        var sql = `INSERT INTO callstack_table 
			(call_act_id, thread_name, call_count, call_clevel, 
			call_uplevel, call_downlevel) VALUES `;

			let length = fullarray.length - 1;
			fullarray.forEach(function(arr, index) {
				insert.push(arr.each_array, arr.stack_name);
				if (arr.up_stack_name != null) {
					insert.push(arr.up_stack_name);
				} else {
					insert.push(arr.stack_name)
				}

				if (arr.down_stack_name != null) {
					insert.push(arr.down_stack_name);
				} else {
					insert.push(arr.stack_name)
				}

				sql += `(?, 
				(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?), 
				(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?))`;
				
				if (index < length) {
					sql += ",";
				}
			});

			sql += "ON DUPLICATE KEY UPDATE " +
				"call_count = VALUES(call_count) + 1";

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add stack name
	 * @param context - To get mysql connection on this object
	 * @param fullarray - All stacktrace
	 * @return Promise
	 */
	insertCallstackName : function(context, fullarray) {
		return new Promise(function(resolved, rejected) {
			var insert = [];
	        var sql = "INSERT IGNORE INTO callstack_name_table " +
			"(callstack_func, callstack_name) VALUES ";
			
			let length = fullarray.length - 1;
			fullarray.forEach(function(arr, index) {
				sql += "(?)";
				insert.push(arr);
				if (index < length) {
					sql += ",";
				}
			});

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            return resolved();
	        });
	    });
	},

	/**
	 * Add user connection time
	 * @param context - To get mysql connection on this object
	 * @param data - User information
	 * @return Promise
	 */
	insertUserConnection : function(context, data) {
		return new Promise(function(resolved, rejected) {
			var insert = [data.uuid, data.connection_time, data.ver_key,
			data.connection_time];
	        var sql = "INSERT INTO user_table SET " +
			"`uuid` = ?, " +
			"`last_connection` = ?, " +
			"`user_ver_id` = ? " +
			"ON DUPLICATE KEY UPDATE " +
			"`last_connection` = ?, " +
			"`user_ver_id` = VALUES(user_ver_id)";

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("insert failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            }

	            if (rows.insertId == 0)
	            	return resolved(true);
	            return resolved(false);
	        });
	    });
	}
}