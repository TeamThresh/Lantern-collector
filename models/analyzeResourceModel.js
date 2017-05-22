module.exports = {

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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
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
				(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?),
				(SELECT call_id FROM callstack_name_table WHERE callstack_name = ?))`;
				
				if (index < length) {
					sql += ",";
				}
			});

			sql += ` ON DUPLICATE KEY UPDATE 
				call_count = VALUES(call_count) + 1`;

	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
	            }

	            return resolved();
	        });
	    });
	},
}