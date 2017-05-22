module.exports = {
	
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
}