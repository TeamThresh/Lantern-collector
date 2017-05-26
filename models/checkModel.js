
var mysqlSetting = require('../models/mysqlSetting');
var AnalyzerModel = require('./analyzerModel');

exports.checkPackageKey = function(package_name, key, callback) {
	mysqlSetting.getWritePool()
        .then(mysqlSetting.getConnection)
        .then(mysqlSetting.connBeginTransaction)
        .then(function(context) {
        	return new Promise((resolved, rejected) => {
        		var select = [package_name, key];
	            var sql = `SELECT pack_name 
	            	FROM package_table 
	                WHERE pack_name = ?
	                AND project_key = ? `;

	            context.connection.query(sql, select, function (err, rows) {
	                if (err) {
	                    var error = new Error(err);
	                    error.status = 500;
	                    return rejected({ context : context, error : error });
	                } else if (rows.length == 0) {
	                	var error = new Error('Not Authorized');
	                    error.status = 403;
	                    return rejected({ context : context, error : error });
	                }

	                
	                return resolved(context);
	            });
        	});
        })
        .then(mysqlSetting.commitTransaction)
        .then(function(data) {
            return callback();
        })
        .catch(function(err) {
            if (err.context) {
                mysqlSetting.rollbackTransaction(err.context)
                    .then(mysqlSetting.releaseConnection)
                    .then(function() {
                        return callback(err.error);
                    });
            } else {
                return callback(err);
            }
        });
}
