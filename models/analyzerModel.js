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
	                return rejected({ context : context, error : error });
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
	                return rejected({ context : context, error : error });
	            }

	            //context.connection.release();
	            return resolved();
	        });
	    });
	},

}