'use strict';

var express = require('express');
var router = express.Router();

var util = require('util');
var os = require('os');
var dns = require('dns');

var io = require.main.exports.io;

module.exports = function (app) {
    app.use('/', router);
};

var Cap = require('cap').Cap,
    decoders = require('cap').decoders,
    PROTOCOL = decoders.PROTOCOL;
var cap = new Cap();

var linkType;
var buffer = new Buffer(65535);
var hostAddress;
var hostname = os.hostname();
console.log('hostname:', hostname);
var devicelist = Cap.deviceList();
devicelist.forEach(function (device) {
    if (device.description !== 'Oracle') {
        console.log('device:', util.inspect(device, false, null));
        device.addresses.forEach(function (address) {
            if (address.addr.match(/((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])([.](?!$)|$)){4}/)) {
                if (address.addr !== '0.0.0.0') {
                    console.log('device:address ', address.addr);
                    hostAddress = address.addr;
                    linkType = cap.open(
                        Cap.findDevice(address.addr),
                        'tcp and port 80',
                        10 * 1024 * 1024,
                        buffer
                    );
                    cap.setMinBytes && cap.setMinBytes(0);
                }
            }
        });
    }
});

var emitPacket = function(packet) {
    return function(err, address) {
        if (!err) {
            packet.hostname = address[0];
            io.sockets.emit('packet', packet);
            console.log('packet:', util.inspect(packet, false, null));
/*
        } else {
            console.log('ERROR:', err);
*/
        }
    };
};

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

router.get('/', function (req, res, next) {
    res.render('index', {
        hostAddress: hostAddress
    });
});

