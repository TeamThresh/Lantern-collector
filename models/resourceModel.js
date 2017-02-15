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
    
    // Main resource Model
    ResourceHeader.resourceParcing(obj)
        .then(function(resourceModel) {
            obj.data.forEach(function(arr, index) {
                // Sub resource Model (each datas)
                ResourceData.resourceDataParcing(arr)
                    .then(function(data) {
                        if (data) {
                            resourceModel.data.push(data);
                        }

                        if (index == obj.data.length-1) {
                            // Save res datas when sub resource include
                            resourceModel.save(function(err){
                                if(err){
                                    // server Error
                                    var error = Error(err);
                                    error.status = 500;
                                    console.error(error);
                                    return callback(500);
                                }
                                return callback(null, resourceModel._id);
                            });
                        }
                    })
                    .catch(function(err) {
                        // parameter error
                        return callback(err);
                    });
            });
        })
        .catch(function(err) {
            // parameter error
            return callback(err);
        })
};

