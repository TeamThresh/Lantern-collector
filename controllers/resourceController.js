/**
 * Created by YS on 2017-02-10.
 */

var resourceModel = require('../models/resourceModel');
var analyzerModel = require('../models/analyzerModel');
//var resourceSender = require('./resourceSender');

/**
 *
 * @type {{
 *  upload: module.exports.upload
 * }}
 */
module.exports = {

    upload: function (req, res, next) {
        var data = {
            access_token: req.header('access-token'),
            dump: req.body
        };

        // TODO access_token 으로 User 인증
        // TODO validation 파싱을 controller로 뺄 것
        resourceModel.saveResourceDump(data.dump, function(err, resource) {
            if (err) {
                return err instanceof Number ? next(err) : next(500);
            }
console.log("Mongo DB Work DONE");
            if (resource.data.length > 0) {
                analyzerModel.saveAnalysisDump(
                    resource, 
                    function(err) {
                        if (err) {
                            return err instanceof Number ? next(err) : next(500);
                        }
                        res.statusCode = 200;
                        return res.json({
                            msg: "complete"
                        });
                    });
            } else {
                res.statusCode = 200;
                return res.json({
                    msg: "complete"
                });
            }
        });

        //resourceSender.send(data.dump);
    }
};
