'use strict';

var Promise = require('bluebird');
const assert = require('assert');
const EventEmitter = require('events');
const inherits = require('util').inherits;
const _ = require('lodash');

const RPC = require('./rpc.js');
const UDPTransport = require('./transport/udp.js');
const Message = require('./message.js');
const Contact = require('./contact.js');
const constants = require('./constants.js');

function Router(contact, options) {
    assert(contact instanceof Contact, 'Invalid contact provided');

    EventEmitter.call(this);

    options = options || {transport: new UDPTransport(contact)};

    this._contact = contact;
    this._kbuckets = {};

    this._rpc = Promise.promisifyAll(options.transport);
    this._rpc.open();
    this._rpc.on('incoming', this.handleIncoming.bind(this));
}

inherits(Router, EventEmitter);

Router.prototype.handleIncoming = function(message, remote) {
    if (message.isRequest()) {
        let contact = new Contact(message.params.contact);
        switch (message.method) {
        case 'PING':
            console.log("Received PING from: " + contact);
            let pong = Message.fromRequest(message, {contact: this._contact});
            this._rpc.send(pong, contact);
            break;
        }
    }
};

Router.prototype.lookup = function(type, key) {
    return new Promise(function (resolve, reject) {
        console.log(this._contact);
        var state = {
            type: type,
            key: key,
            limit: constants.ALPHA
        };
        state.shortList = this._getNearestContacts(key, state.limit, this._contact.nodeID);
        state.closestNode = state.shortList[0];
        // if (!state.closestNode) reject(new Error('Not connected to any peers'));
        this._iterativeFind(state, state.shortList);
    }.bind(this));
};

Router.prototype._iterativeFind = function(state, contacts) {
    return new Promise(function (resolve, reject) {
        if (contacts.length === 0) return reject(new Error('Not connected to any peers'));
        console.log("This shouldn't happen?");
    }.bind(this));
};

Router.prototype.size = function() {
    var total = 0;
    _.each(this._kbuckets, (val) => total+=val.length);
    return total;
};

Router.prototype._getNearestContacts = function(key, limit, nodeID) {
    var nearest = [];
    limit = Math.min(limit, this.size());
    while (nearest.length < limit) {
    }
    return nearest;
};

Router.prototype.ping = function(contact) {
    assert(contact instanceof Contact, 'Invalid contact provided');
    var self = this;
    return new Promise(function(resolve, reject) {
        let ping = Message.createMessage('PING', {contact: self._contact});
        let RTT = Date.now();
        self._rpc.sendAsync(ping, contact)
            .then(()=>{
                resolve(Date.now()-RTT);
            });
    });
};

module.exports = Router;
