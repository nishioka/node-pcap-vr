var express = require('express'),
  config = require('./config/config');

var app = express();

module.exports.server = app.listen(config.port);
module.exports.io = require('socket.io').listen(module.exports.server);

require('./config/express')(app, config);