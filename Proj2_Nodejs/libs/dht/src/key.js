'use strict';

var assert = require('assert');

var constants = require('./constants.js');

function Key(key) {
    assert(key, 'Key cannot be null');
    assert(key.length === constants.B/4, 'Invalid key size: '+key.length+' != '+constants.B/4);
    this.key = key;
    Object.defineProperty(this, 'length', {get: function(){return this.key.length;}});
}

Key.prefix = function(key1, key2) {
    let dist = Key.distance(key1, key2);
    let prefix = constants.B;

    for (let [ i, byte ] of dist.entries()) {
        if (byte === 0) {
            prefix -= 8;
            continue;
        }

        for (let i = 0; i < 8; ++i) {
            if (byte & (0x80 >> i)) return --prefix;
            --prefix;
        }
    }

    return prefix;
};

Key.toBuffer = function(key) {
    if (key && key instanceof Key) key = key.key;
    assert(key && typeof key === 'string', 'Invalid key provided');

    let buf = new Buffer(constants.B/8);
    buf.write(key, 0, 'hex');
    return buf;
};

Key.distance = function(key1, key2) {
    let dist = new Buffer(constants.B/8);
    let b1 = Buffer.isBuffer(key1) ? key1 : Key.toBuffer(key1);
    let b2 = Buffer.isBuffer(key2) ? key2 : Key.toBuffer(key2);

    for (let i = 0; i < constants.B/8; ++i)
        dist[i] = b1[i] ^ b2[i];

    return dist;
};

Key.compare = function(key1, key2) {
    let b1 = Buffer.isBuffer(key1) ? key1 : Key.toBuffer(key1);
    let b2 = Buffer.isBuffer(key2) ? key2 : Key.toBuffer(key2);

    for (let i = 0; i < b1.length; ++i) {
        if (b1[i] !== b2[i]) {
            if (b1[i] < b2[i]) return -1;
            else return 1;
        }
    }

    return 0;
};

Key.prototype.equals = function(k) {
    return k instanceof Key && this.key === k.key;
};

Key.prototype.distance = function(key) {
    return Key.distance(this, key);
};

Key.prototype.compare = function(key) {
    return Key.compare(this, key);
};

Key.prototype.toBuffer = function() {
    return Key.toBuffer(this);
};

Key.prototype.toString = function() {
    return this.key;
};

Key.prototype.toJSON = function() {
    return this.key;
};

module.exports = Key;
