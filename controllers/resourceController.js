/**
 * Created by YS on 2017-02-10.
 */

var resourceModel = require('../models/resourceModel');

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
        resourceModel.saveResourceDump(data.dump, function(err, id) {
            if (err) {
                return err instanceof Number ? next(500) : next(err);
            }

            res.statusCode = 200;
            return res.json({
                msg: "complete"
            });
        });
    }
};