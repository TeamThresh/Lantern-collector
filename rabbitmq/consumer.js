var amqp = require('amqplib/callback_api');
var api = require('../controllers');

exports.startConsumer = function() {
	amqp.connect('amqp://45.32.8.52', function(err, conn) {
		conn.createChannel(function(err, ch) {
			var q = 'dump';

			ch.assertQueue(q, {durable : false});
			ch.consume(q, function(msg) {
				api.resourceController.uploadFromQueue(msg.content.toString());
			});
		});
	});
};