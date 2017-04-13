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
				app_info.app_ver, app_info.device_name];
	        var sql = "SELECT ver_id " +
	            "FROM version_table " +
	            "WHERE `package_name` = ? " +
	            "AND `os_ver` = ? " +
	            "AND `app_ver` = ? " +
	            "AND `device_name` = ? ";
	        context.connection.query(sql, select, function (err, rows) {
	            if (err) {
	                var error = new Error("db failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            } else if (rows.length == 0) {
	            	require('./analyzerModel')
	            		.newVersion(context, app_info)
	            		.then(function(result) {
	            			app_info.ver_key = result;
	            			return resolved(app_info.ver_key);
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
				app_info.app_ver, app_info.device_name];
			var sql = "INSERT INTO version_table SET " +
	            "`package_name` = ?, " +
	            "`os_ver` = ?, " +
	            "`app_ver` = ?, " +
	            "`device_name` = ? ";
	        context.connection.query(sql, insert, function (err, rows) {
	            if (err) {
	                var error = new Error("db failed");
	                error.status = 500;
	                console.error(err);
	                return rejected(error);
	            } else if (rows.insertId) {
	            	app_info.ver_key = rows.insertId;
	            }
	            //context.connection.release();
	            return resolved(app_info.ver_key);
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
	 * @return Promise
	 */
	insertCount : function(context, key) {
		return new Promise(function(resolved, rejected) {
			var update = [key];
	        var sql = "UPDATE activity_table SET " +
	            "`user_count` = `user_count` + 1 " +
	            "WHERE `act_id` = ? ";
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
	            "`act_craw_id` = ?, " +
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
	            "`act_mraw_id` = ?, " +
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
			var insert = [key, host.name, host.status, host.speed, host.speed];
	        var sql = "INSERT INTO obc_table SET " +
	            "`act_host_id` = ?, " +
	            "`host_name` = ?, " +
	            "`host_status` = ?, " +
	            "`host_speed` = ?, " +
	            "`host_count` = 1 " +
	            "ON DUPLICATE KEY UPDATE " +
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
	insertCrash : function(context, key, crash_info) {
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
			var insert = [key, render_info, render_info];
	        var sql = "INSERT INTO ui_table SET " +
	            "`act_ui_id` = ?, " +
	            "`ui_sum` = ?, " +
	            "`ui_count` = 1 " +
	            "ON DUPLICATE KEY UPDATE " +
	            "`ui_sum` = `ui_sum` + ?, " +
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
	}
}
