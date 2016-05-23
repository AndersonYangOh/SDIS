'use strict';

var assert = require('assert');

var constants = require('./constants.js');

function Key(key) {
    assert(key, 'Key cannot be null');
    assert(key.length === constants.B/4, 'Invalid key size: '+key.length+' != '+constants.B/4);
    this.key = key;
    Object.defineProperty(this, 'length', {get: function(){return this.key.length;}});
}

Key.toBuffer = function(key) {
    if (key && key instanceof Key) key = key.key;
    assert(key && typeof key === 'string', 'Invalid key provided');

    var buf = new Buffer(constants.B/8);
    buf.write(key, 0, 'hex');
    return buf;
};

Key.distance = function(key1, key2) {
    var dist = new Buffer(constants.B/8);
    var b1 = Key.toBuffer(key1);
    var b2 = Key.toBuffer(key2);

    for (let i = 0; i < constants.B/8; ++i)
        dist[i] = b1[i] ^ b2[i];

    return dist;
};

Key.compare = function(key1, key2) {
    var b1 = Key.toBuffer(key1);
    var b2 = Key.toBuffer(key2);

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
