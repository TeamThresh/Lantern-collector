/**
 * Created by YS on 2017-03-13.
 */
var mysqlSetting = require("../models/mysqlSetting");

var AnalyzerResourceController = require("./analyze/analyzeResourceController");
var AnalyzerRequestController = require("./analyze/analyzeRequestController");
var AnalyzerRenderController = require("./analyze/analyzeRenderController");
var AnalyzerCrashController = require("./analyze/analyzeCrashController");
var AnalyzerUserController = require("./analyze/analyzeUserController");

/**
 * To dump client resource data into Analysis Database
 * @param obj - Validated resource
 * @param callback(err)
 */
let length = 0;
exports.saveAnalysisDump = function(obj, callback) {
	// Set head information of resource
	var header = {
		app_name : obj.package_name,
		os_ver : obj.device_info.os,
		app_ver : obj.device_info.app,
		device_name : obj.device_info.device,
		uuid : obj.device_info.uuid,
		country_name : obj.device_info.location.country_name,
		code : obj.device_info.location.code
	};
console.log(header.uuid);
	// TODO 다중 쿼리로 변경할 필요가 있음
	mysqlSetting.getPool()
        .then(mysqlSetting.getConnection)
        .then(mysqlSetting.connBeginTransaction)
        .then(function(context) {
        	return new Promise(function(resolved, rejected) {
        		AnalyzerUserController.addUserConnect(context, header)
        			.then(function(retention) {
						header.retention = retention;
        				return resolved(context);
        			})
        			.catch(function(err) {
						return rejected(err);
        			});
        	});
        })
        .then(function(context) {
        	context.isFail = false;
        	// start analyzing
        	return new Promise(function(resolved, rejected) {
        		length = obj.data.length;
        		dumpSavingLooper(context, obj.data, header, function(err) {
        			if (err) {
						return rejected(err);
        			}
        			console.log("Looper 반환 완료");
    				return resolved(context);
        		});
        	});
        })
        .then(function(context) {
        	// After Process, 콜스택 저장
        	return new Promise(function(resolved, rejected) {
        		// 실행은 됬지만 트레이스가 없는경우 
				if (header.thread_trace) {
					return resolved(context);
				}
				
        		AnalyzerResourceController
        			.saveCallstack(context, header)
        			.then(function() {
        				return resolved(context);
        			})
        			.catch(function(err) {
						return rejected(err);
        			});
        	});
        })
	    .then(mysqlSetting.commitTransaction)
	    .then(function(data) {
	        return callback(null);
	    })
    	.catch(function(err) {
            if (err.context) {
                mysqlSetting.rollbackTransaction(err.context)
                    .then(mysqlSetting.releaseConnection)
                    .then(function() {
                        return callback(err.error);
                    });
            } else {
                callback(err);
            }
        })
};

/**
 * Dump saving loop
 * @param context - To get mysql connection on this object
 * @param list - All dump list
 * @param header - Dump data header (Which use all data type)
 * @return Promise
 */
let i = 1;
function dumpSavingLooper(context, list, header, callback) {
	// TODO 비동기로 바꿀 것
	if (!context.isFail) {

			if (list.length != 0) {
				let arr = list.splice(0, 1)[0];

				// switch each array object's type
		    	switch(arr.type) {
		    		case "res": // Analyze resource
		    			AnalyzerResourceController
		    				.analyzeResource(context, header, arr)
		    				.then(function() {
		    					return dumpSavingLooper(context, list, header, callback);
		    				})
		    				.catch(function(err) {
					            context.isFail = err;
					            return callback(context.isFail);
		    				});
		        		break;
					case "render": // Analyze rendering data
				    	AnalyzerRenderController
				    		.analyzeRender(context, header, arr)
				    		.then(function() {
				    			return dumpSavingLooper(context, list, header, callback);
		    				})
				    		.catch(function(err) {
					            context.isFail = err;
					            return callback(context.isFail);
				    		});
				    	break;
					case "crash": // Analyze crash info
						AnalyzerCrashController
							.analyzeCrash(context, header, arr)
							.then(function() {
								return dumpSavingLooper(context, list, header, callback);
		    				})
							.catch(function(err) {
								context.isFail = err;
	        					return callback(context.isFail);
							});
				        break;
					case "request": // Analyze network outbound call
	    				AnalyzerRequestController
	    					.analyzeRequest(context, header, arr)
	    					.then(function() {
	    						return dumpSavingLooper(context, list, header, callback);
		    				})
	    					.catch(function(err) {
					            console.error(err);
	    						context.isFail = err;
								return callback(context.isFail);
	    					});
				        break;
				}
			} else {
				return callback();
			}
	
	} else {
		// 루퍼 종료
	}
}
