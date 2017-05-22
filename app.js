var express = require('express');
var logger = require('morgan');
var bodyParser = require('body-parser');
var compression = require('compression');

var routes = require('./routes/index');
var errors = require('./routes/error');

var app = express();

app.use(bodyParser.json({limit:"50mb"}));
app.use(bodyParser.urlencoded({ extended: false }));

// compress all requests 
app.use(compression())

app.use(logger('dev'));

// Route Handlers
app.use(routes());

// error handlers
app.use(function(err, req, res, next) {
  errors(err, res, app.get('env'));
});


module.exports = app;
