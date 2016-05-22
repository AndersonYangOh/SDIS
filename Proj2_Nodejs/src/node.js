'use strict';

const assert = require('assert');

const Contact = require('./contact.js');
const Router = require('./router.js');
const Message = require('./message.js');

function Node(contact) {
    assert(contact instanceof Contact, 'Invalid contact provided');
    this.contact = contact;
    this.router = new Router(contact);
    Object.defineProperty(this, 'id', {get: function(){return this.contact.nodeID;}});
}

Node.prototype.ping = function(contact) {
    if (contact instanceof Node) contact = contact.contact;
    console.log("Pinging "+contact);
    return this.router.ping(contact);
};

module.exports = Node;
