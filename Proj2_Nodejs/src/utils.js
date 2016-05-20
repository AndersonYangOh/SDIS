var crypto = require('crypto');

exports.validPort = function(port) {
    return port > 0 && port < 65536;
};

exports.createID = function(data) {
    return crypto.createHash('sha1').update(data).digest('hex');
};
