'use strict';

var express = require('express');
var router = express.Router();

var os = require('os');
var util = require('util');

var io = require.main.exports.io;

io.sockets.on('connection', function(socket) {
    socket.on('sensor', function(data) { // センサーデータを受け取った際のハンドラ
        io.sockets.emit('sensor', data);
    });
});

module.exports = function (app) {
  app.use('/', router);
};

var linkType;
var buffer = new Buffer(65535);

var emitPacket = function(packet) {
    return function(err, addresse) {
        if (!err) {
            packet.hostname = addresse;
            io.sockets.emit('msg', packet);
        }
    };
};

/*
cap.on('packet', function(nbytes, trunc) {
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
*/

router.get('/control', function (req, res, next) {
    res.render('control', {
        //hostAddress: hostAddress
    });
});

