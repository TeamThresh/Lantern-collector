/**
 * Created by YS on 2017-02-10.
 */
var errorCode = require('./errorCode');

module.exports = function (err, res, mode) {
	console.log('에러');
    if (err instanceof Error) {
        console.log(err);
        res.status(err.status).json({msg : err.msg});
    } else {
        var error = errorCode[err];
        console.log(error);
        if (mode === 'development') {
            // development error handler
            res.status(error.status).json(error);

        } else if (mode === 'production') {
            // production error handler
            res.status(error.status).json(error);
        }
    }
};
