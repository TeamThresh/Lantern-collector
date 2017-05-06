/**
 * Created by YS on 2017-03-13.
 */
var mysqlSetting = require("../models/mysqlSetting");

var AnalyzerResourceModel = require("../models/analyzeResourceModel");
var AnalyzerRequestModel = require("../models/analyzeRequestModel");
var AnalyzerRenderModel = require("../models/analyzeRenderModel");
var AnalyzerCrashModel = require("../models/analyzeCrashModel");
var AnalyzerUserModel = require("../models/analyzeUserModel");

/**
 * To dump client resource data into Analysis Database
 * @param obj - Validated resource
 * @param callback(err)
 */
let length = 0;
exports.saveAnalysisDump = function(obj, callback) {
	// Set head infomation of resource
	var header = {
		app_name : obj.package_name,
		os_ver : obj.device_info.os,
		app_ver : obj.device_info.app,
		device_name : obj.device_info.device,
		uuid : obj.device_info.uuid,
		country_name : obj.device_info.location.country_name,
		code : obj.device_info.location.code
	};
	// TODO 다중 쿼리로 변경할 필요가 있음
	mysqlSetting.getPool()
        .then(mysqlSetting.getConnection)
        .then(mysqlSetting.connBeginTransaction)
        .then(function(context) {
        	return new Promise(function(resolved, rejected) {
        		AnalyzerUserModel.addUserConnect(context, header)
        			.then(function(retention) {
						header.retention = retention;
        				return resolved(context);
        			})
        			.catch(rejected);
        	});
        })
        .then(function(context) {
        	context.isFail = false;
        	// start analyzing
        	return new Promise(function(resolved, rejected) {
        		length = obj.data.length;
        		dumpSavingLooper(context, obj.data, header, function(err) {
        			if (err) {
        				context.connection.rollback();
						mysqlSetting.releaseConnection(context);
						return rejected(err);
        			}
        			console.log("Looper 반환 완료");
    				return resolved(context);
        		});
        	});
        })
        .then(function(context) {
        	// After Process
        	return new Promise(function(resolved, rejected) {
        		AnalyzerResourceModel
        			.saveCallstack(context, header)
        			.then(function() {
        				return resolved(context);
        			})
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
		    			AnalyzerResourceModel
		    				.analyzeResource(context, header, arr)
		    				.then(function() {
		    					return dumpSavingLooper(context, list, header, callback);
//		    					if (++i == length)
//		    						return callback();
		    				})
		    				.catch(function(err) {
					            console.error(err);
					            context.isFail = err;
					            return callback(context.isFail);
		    				});
//	    				return dumpSavingLooper(context, list, header, callback);
		        		break;
					case "render": // Analyze rendering data
				    	AnalyzerRenderModel
				    		.analyzeRender(context, header, arr)
				    		.then(function() {
				    			return dumpSavingLooper(context, list, header, callback);
//		    					if (++i == length)
//		    						return callback();
		    				})
				    		.catch(function(err) {
					            console.error(err);
					            context.isFail = err;
					            return callback(context.isFail);
				    		});
//			    		return dumpSavingLooper(context, list, header, callback);
				    	break;
					case "crash": // Analyze crash info
						AnalyzerCrashModel
							.analyzeCrash(context, header, arr)
							.then(function() {
								return dumpSavingLooper(context, list, header, callback);
//		    					if (++i == length)
//		    						return callback();
		    				})
							.catch(function(err) {
					            console.error(err);
								context.isFail = err;
	        					return callback(context.isFail);
							});
//						return dumpSavingLooper(context, list, header, callback);
				        break;
					case "request": // Analyze network outbound call
	    				AnalyzerRequestModel
	    					.analyzeRequest(context, header, arr)
	    					.then(function() {
	    						return dumpSavingLooper(context, list, header, callback);
		    					//if (++i == length)
//		    						return callback();
		    				})
	    					.catch(function(err) {
					            console.error(err);
	    						context.isFail = err;
								return callback(context.isFail);
	    					});
//    					return dumpSavingLooper(context, list, header, callback);
				        break;
				}
			} else {
				return callback();
				console.log("Looper 전부 실행");
			}
	
	} else {
		console.log("에러 발 생 !!");
	}
}
