'use strict';

var assert = require('assert');
var utils = require('./utils.js');
var Key = require('./key.js');

function Contact({ address, port, id }) {
    if (!(this instanceof Contact)) return new Contact(arguments[0]);

    assert(typeof address === 'string', "Invalid address " + address);
    assert(typeof port === 'number', "Invalid port " + port);
    assert(utils.validPort(port), "Invalid port "+ port);

    this.address = address;
    this.port = port;
    this.nodeID = new Key(id || utils.createID(this.fullAddress()));
    return this;
}

Contact.compare = function(c1, c2) {
    return c1.nodeID.compare(c2.nodeID);
};

Contact.distance = function(c1, c2) {
    return c1.nodeID.distance(c2.nodeID);
};

Contact.prototype.equals = function(c) {
    return Contact.equals(this, c);
};

Contact.prototype.fullAddress = function() {
    return this.address+":"+this.port;
};

Contact.prototype.toString = function() {
    return this.fullAddress()+"["+this.nodeID+"]";
};

Contact.equals = function(c1, c2) {
    return (c1 instanceof Contact) && (c2 instanceof Contact) && c1.nodeID.equals(c2.nodeID);
};


module.exports = Contact;
