module.exports = {

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
	                return rejected({ context : context, error : error });
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
	                var error = new Error(err);
	                error.status = 500;
	                return rejected({ context : context, error : error });
	            }

	            return resolved();
	        });
	    });
	},

}