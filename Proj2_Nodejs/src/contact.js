'use strict';

var assert = require('assert');
var utils = require('./utils.js');
var Key = require('./key.js');

function Contact(options) {
    if (!(this instanceof Contact)) return new Contact(options);

    assert(typeof options === 'object', "Invalid options " + options);
    assert(typeof options.address === 'string', "Invalid address " + options.address);
    assert(typeof options.port === 'number', "Invalid port " + options.port);
    assert(utils.validPort(options.port), "Invalid port "+options.port);

    this.address = options.address;
    this.port = options.port;
    this.nodeID = new Key(options.nodeID || utils.createID(this.fullAddress()));
}

Contact.prototype.fullAddress = function() {
    return this.address+":"+this.port;
};

Contact.prototype.toString = function() {
    return this.fullAddress()+"["+this.nodeID+"]";
};

module.exports = Contact;
