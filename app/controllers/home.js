'use strict';

var express = require('express'),
  router = express.Router(),
  Article = require('../models/article');

var dns = require('dns');
var util = require('util');

//console.log('home',require.main);

var io = require('socket.io').listen(require.main.exports.server);
io.sockets.on('connection', function(socket) {
    socket.on('msg', function(data) {
        io.sockets.emit('msg', data);
    });
});

module.exports = function (app) {
  app.use('/', router);
};

var Cap = require('cap').Cap,
    decoders = require('cap').decoders,
    PROTOCOL = decoders.PROTOCOL;

console.log('device list', util.inspect(Cap.deviceList(), { showHidden: true, depth: null }));

var c = new Cap(),
    device = Cap.findDevice('192.168.1.2'),
    filter = 'tcp and dst port 80',
    bufSize = 10 * 1024 * 1024,
    buffer = new Buffer(65535);

var linkType = c.open(device, filter, bufSize, buffer);

c.setMinBytes && c.setMinBytes(0);

var emitPacket = function(packet) {
    return function(err, addresses) {
        if (!err) {
            //console.log('packet:', util.inspect(packet, { showHidden: true, depth: null }));
            //console.log('addresses:', JSON.stringify(addresses));
            packet.hostname = addresses;
/*
            addresses.forEach(function (a) {
                dns.reverse(a, function (err, domains) {
                    if (err) {
                        console.log('reverse for ' + a + ' failed: ' +
                            err.message);
                    } else {
                        console.log('reverse for ' + a + ': ' +
                            JSON.stringify(domains));
                    }
                });
            });
*/
            io.sockets.emit('msg', packet);
        }
    };
};

c.on('packet', function(nbytes, trunc) {
    var packet = {};
    packet.length = nbytes;
    packet.truncated = (trunc ? 'yes' : 'no');

    if (linkType === 'ETHERNET') {
        var ret = decoders.Ethernet(buffer);
        packet.linkType = 'ETHERNET';

        if (ret.info.type === PROTOCOL.ETHERNET.IPV4) {
            packet.info = {};
            packet.info.type = 'IPV4';

            ret = decoders.IPV4(buffer, ret.offset);
            packet.info.srcaddr = ret.info.srcaddr;
            packet.info.dstaddr = ret.info.dstaddr;

            var datalen;
            if (ret.info.protocol === PROTOCOL.IP.TCP) {
                packet.info.protocol = 'TCP';
                datalen = ret.info.totallen - ret.hdrlen;

                ret = decoders.TCP(buffer, ret.offset);
                packet.info.srcport = ret.info.srcport;
                packet.info.dstport = ret.info.dstport;
                datalen -= ret.hdrlen;
                packet.info.dataLength = datalen;
                packet.buffer = buffer.toString('binary', ret.offset, ret.offset + datalen);
            } else if (ret.info.protocol === PROTOCOL.IP.UDP) {
                packet.info.protocol = 'UDP';
                datalen = ret.info.totallen - ret.hdrlen;

                ret = decoders.UDP(buffer, ret.offset);
                packet.info.srcport = ret.info.srcport;
                packet.info.dstport = ret.info.dstport;
                datalen -= ret.hdrlen;
                packet.info.dataLength = datalen;
                packet.buffer = buffer.toString('binary', ret.offset, ret.offset + ret.info.length);
            } else {
                packet.info.protocol = PROTOCOL.IP[ret.info.protocol];
            }
        }
        dns.reverse(packet.info.dstaddr, emitPacket(packet));
    }
});

router.get('/', function (req, res, next) {
  var articles = [new Article(), new Article()];
    res.render('index', {
      title: 'Generator-Express MVC',
      articles: articles
    });
});
