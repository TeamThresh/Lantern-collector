/**
 * Created by YS on 2017-03-13.
 */
var mysqlSetting = require("../models/mysqlSetting");

var AnalyzerResourceModel = require("../models/analyzeResourceModel");
var AnalyzerRequestModel = require("../models/analyzeRequestModel");
var AnalyzerRenderModel = require("../models/analyzeRenderModel");
var AnalyzerCrashModel = require("../models/analyzeCrashModel");

/**
 * To dump client resource data into Analysis Database
 * @param obj - Validated resource
 * @param callback(err)
 */
exports.saveAnalysisDump = function(obj, callback) {
	// Set head infomation of resource
	var header = {
		app_name : obj.package_name,
		os_ver : obj.device_info.os,
		app_ver : obj.device_info.app,
		device_name : obj.device_info.device
	};
	// TODO 다중 쿼리로 변경할 필요가 있음
	mysqlSetting.getPool()
        .then(mysqlSetting.getConnection)
        .then(mysqlSetting.connBeginTransaction)
        .then(function(context) {
        	// start analyzing
        	return new Promise(function(resolved, rejected) {
        		dumpSavingLooper(context, obj.data, header)
        			.then(resolved)
        			.catch(rejected);
        	});
        })
	    .then(mysqlSetting.commitTransaction)
	    .then(function(data) {
	        return callback(null);
	    })
    	.catch(function(err) {
	        return callback(err);
	    });
};

function dumpSavingLooper(context, list, header) {
	context.isFail = false;

	return new Promise(function (resolved, rejected) {
		console.log("rest length : "+ list.length);
		if (list.length != 0) {
			let arr = list.splice(0, 1)[0];

			// switch each array object's type
	    	switch(arr.type) {
	    		case "res": // Analyze resource
	    			AnalyzerResourceModel
	    				.analyzeResource(context, header, arr)
	    				.then(function() {
							if (list.length == 0) {
								if (context.isFail) return rejected(context.isFail);
						        //return resolved();
						    }
							return dumpSavingLooper(context, list, header)
								.then(resolved(context));
	    				})
	    				.catch(function(err) {
			    			context.connection.rollback();
			            	mysqlSetting.releaseConnection(context);
				            var error = new Error(err);
				            error.status = 500;
				            console.error(err);
				            context.isFail = error;
				            return rejected(context.isFail);
	    				})
	        		break;
				case "render": // Analyze rendering data
			    	AnalyzerRenderModel
			    		.analyzeRender(context, header, arr)
			    		.then(function() {
							if (list.length == 0) {
								if (context.isFail) return rejected(context.isFail);
						        //return resolved();
						    }
							return dumpSavingLooper(context, list, header)
								.then(resolved(context));
			    		})
			    		.catch(function(err) {
			    			context.connection.rollback();
			            	mysqlSetting.releaseConnection(context);
				            var error = new Error(err);
				            error.status = 500;
				            console.error(err);
				            context.isFail = error;
				            return rejected(context.isFail);
			    		})
			    	break;
				case "crash": // Analyze crash info
					AnalyzerCrashModel
						.analyzeCrash(context, header, arr)
						.then(function() {
							if (list.length == 0) {
								if (context.isFail) return rejected(context.isFail);
						        //return resolved();
						    }
							return dumpSavingLooper(context, list, header)
								.then(resolved(context));
						})
						.catch(function(err) {
			            	// if need rollback remove comment
			            	context.connection.rollback();
			            	mysqlSetting.releaseConnection(context);
				            var error = new Error(err);
				            error.status = 500;
				            console.error(error);
							context.isFail = error;
        					return rejected(context.isFail);
						});

			        break;
				case "request": // Analyze network outbound call
    				AnalyzerRequestModel
    					.analyzeRequest(context, header, arr)
    					.then(function() {
							if (list.length == 0) {
								if (context.isFail) return rejected(context.isFail);
						        //return resolved(context);
						    }
						    return dumpSavingLooper(context, list, header)
						    	.then(resolved(context));
    					})
    					.catch(function(err) {
			            	context.connection.rollback();
			            	mysqlSetting.releaseConnection(context);
				            var error = new Error(err);
				            error.status = 500;
				            console.error(error);
    						context.isFail = err;
				        	return rejected(context.isFail);
    					});
			        break;
			}
		} else {
			console.log("반환");
			return resolved(context);
		}
	});
	
}
