/**
 * Created by YS on 2017-02-07.
 */
var express = require('express');
var api = require('../controllers');
var router = express.Router();

module.exports = function(){

  // User registration
  router.post('/api/upload', api.resourceController.upload);        // 데이터 업로드

  // catch 404 and forward to error handler
  router.all('/*', function(req, res, next) {
    next(404);
  });

  return router;
};

