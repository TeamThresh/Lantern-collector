/**
 * Created by YS on 2017-02-07.
 */
var credentials = require('../credentials');

// MongoDB module
var mongoose = require('mongoose');
mongoose.connect(credentials.mongodb.host);

var Schema = mongoose.Schema;
var SchemaSet = require(credentials.mongoSchemaSet.resourceSchemaSet);

module.exports.resourceParcing = function(obj) {
	return new Promise(function(resolved, rejected) {
		var ResourceHeaderSchema = mongoose.model('resourceModels', resourceHeaderSchema);
		var resourceModel = new ResourceHeaderSchema({
			launch_time : obj.launch_time,
			dump_interval : obj.dump_interval,
			package_name : obj.package_name,
			device_info : obj.device_info,
			data : []
		});

    	var error = resourceModel.validateSync();
    	if (error) {
    		console.error(error);
			return rejected(9400);
    	}

		return resolved(resourceModel);
	});
};

var resourceHeaderSchema = new Schema(SchemaSet.resHeaderSchema);