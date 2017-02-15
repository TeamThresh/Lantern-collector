/**
 * Created by YS on 2017-02-07.
 */
var credentials = require('../credentials');

// MongoDB module
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var SchemaSet = require(credentials.mongoSchemaSet.resourceSchemaSet);

module.exports.resourceDataParcing = function(obj) {
	return new Promise(function(resolved, rejected) {
		var resData;
		switch(obj.type.trim()) {
	        case "res" :
	        	resData = new ResourceDataRes(obj, SchemaSet.resSchema);
	            break;
	        case "crash" :
	        	resData = new ResourceDataCrash(obj, SchemaSet.crashSchema);
	            break;
	        case "click" :
	        	resData = new ResourceDataClick(obj, SchemaSet.clickSchema);
	            break;
	        case "request" :
				resData = new ResourceDataRequest(obj, SchemaSet.requestSchema);
	            break;
            case "render" :
            	resData = new ResourceDataRender(obj, SchemaSet.renderSchema);
            	break;
        	default:
        		return resolved();
	    }
		
		var returnData = resData.setMongooseModel(obj);
    	var error = returnData.validateSync();
    	if (error) {
    		console.error(error);
			return rejected(9400);
    	}

		return resolved(returnData);
	});
};

class ResourceData {
	constructor(obj, set) {
		this.obj = obj;
		this.set = set;
    }

    setMongooseModel(data) {
    	return null;
    }

}

class ResourceDataRes extends ResourceData {
	constructor(obj, set) {
		super(obj, set);
	}

	setMongooseModel(data) {
		return mongoose.model('resourceDataSchema', resourceDataSchema)(data);
	}
}

class ResourceDataCrash extends ResourceData {
	constructor(obj, set) {
		super(obj, set);
	}

	setMongooseModel(data) {
		return mongoose.model('resourceCrashSchema', resourceCrashSchema)(data);
	}
}

class ResourceDataRequest extends ResourceData {
	constructor(obj, set) {
		super(obj, set);
	}

	setMongooseModel(data) {
		return mongoose.model('resourceRequestSchema', resourceRequestSchema)(data);
	}
}

class ResourceDataClick extends ResourceData {
	constructor(obj, set) {
		super(obj, set);
	}

	setMongooseModel(data) {
		return mongoose.model('resourceClickSchema', resourceClickSchema)(data);
	}
}

class ResourceDataRender extends ResourceData {
	constructor(obj, set) {
		super(obj, set);
	}

	setMongooseModel(data) {
		return mongoose.model('resourceRenderSchema', resourceRenderSchema)(data);
	}
}

var resourceDataSchema = new Schema(SchemaSet.resSchema);

var resourceCrashSchema = new Schema(SchemaSet.crashSchema);

var resourceRequestSchema = new Schema(SchemaSet.requestSchema);

var resourceClickSchema = new Schema(SchemaSet.clickSchema);

var resourceRenderSchema = new Schema(SchemaSet.renderSchema);