module.exports = {
	
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
}