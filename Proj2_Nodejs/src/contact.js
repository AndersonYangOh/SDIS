'use strict';

var assert = require('assert');
var utils = require('./utils.js');

function Contact(options) {
    assert(typeof options === 'object', "Invalid options " + options);
    assert(typeof options.address === 'string', "Invalid address " + options.address);
    assert(typeof options.port === 'number', "Invalid port " + options.port);
    assert(utils.validPort(options.port), "Invalid port "+options.port);

    this.address = options.address;
    this.port = options.port;
    this.nodeID = options.nodeID || utils.createID(this.fullAddress());
}

Contact.prototype.fullAddress = function() {
    return this.address+":"+this.port;
};

Contact.prototype.toString = function() {
    return this.fullAddress()+"["+this.nodeID+"]";
};

module.exports = Contact;
