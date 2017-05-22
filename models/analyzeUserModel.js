module.exports = {
	
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