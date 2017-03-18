/**
 * Created by YS on 2017-02-07.
 */
var ResourceHeader = require('./resourceHeader');
var ResourceData = require('./resourceData');

/**
 * To dump client resource data in mongo
 * @param obj - ResourceHeader
 * @param callback(err, insert_id)
 */
exports.saveResourceDump = function(obj, callback) {
   console.log("save res start"); 
    // Main resource Model
    ResourceHeader.resourceParcing(obj)
        .then(function(resourceModel) {
            var isFail = false;
	if (obj.data.length > 0) {
            obj.data.forEach(function(res, index, arr) {
                // Sub resource Model (each datas)
                ResourceData.resourceDataParcing(res)
                    .then(function(data) {
                        if (data) {
                            resourceModel.data.push(data);
                        }

                        if (index == arr.length-1) {
                            // Save res datas when sub resource include
                            resourceModel.save(function(err){
                                if(err){
                                    // server Error
                                    var error = Error(err);
                                    error.status = 500;
                                    console.error(error);
                                    isFail = err;
                                }
                                return callback(isFail, resourceModel);
                            });
                        }
                    })
                    .catch(function(err) {
                        // parameter error
                        if (index == arr.length-1) {
                            return callback(err);
                        } else {
                            return isFail = err;
                        }
                    });
            });
	} else {
		return callback(isFail, resourceModel);
	}
        })
        .catch(function(err) {
            // parameter error
            return callback(err);
        })
};
