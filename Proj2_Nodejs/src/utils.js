'use strict';

var crypto = require('crypto');

var constants = require('./constants.js');

exports.validPort = function(port) {
    return port > 0 && port < 65536;
};

exports.createID = function(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
};

exports.keyToBuffer = function(key) {
    var buffer = new Buffer
};

exports.distance = function(key1, key2) {
};
