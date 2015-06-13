

var express = require('express'),
  config = require('./config/config');

var app = express();

module.exports.server = app.listen(config.port);
//console.log('app',module);

require('./config/express')(app, config);

