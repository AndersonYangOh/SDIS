'use strict';

const Promise = require('bluebird');
const assert = require('assert');
const EventEmitter = require('events');
const inherits = require('util').inherits;
const _ = require('lodash');

const RPC = require('./rpc.js');
const Message = require('./message.js');
const Contact = require('./contact.js');
const KBucket = require('./kbucket.js');
const constants = require('./constants.js');

function Router(contact, options) {
    assert(contact instanceof Contact, 'Invalid contact provided');

    EventEmitter.call(this);

    this._contact = contact;
    this._kbuckets = {};

    this._rpc = options.transport;

    Object.defineProperty(this, 'length', {get: () => {return this.size();}});
}
inherits(Router, EventEmitter);

Router.prototype.findNode = function(key) {
    return this.lookup('NODE', key);
};

Router.prototype.findValue = function(key) {
    return this.lookup('VALUE', key);
};

Router.prototype.lookup = function(type, key) {
    var state = {
        type: type,
        key: key,
        limit: constants.ALPHA
    };
    state.shortList = this._getNearestContacts(key, state.limit, this._contact.nodeID);
    state.closestNode = state.shortList[0];

    if (!state.closestNode) throw new Error('Not connected to any peers');

    state.closestNodeDistance = key.distance(state.closestNode.nodeID);

    return this._iterativeFind(state, state.shortList);
};

Router.prototype.addContact = function(contact) {
    var bucketIdx = 0;

    if (!this._kbuckets[bucketIdx]) {
        this._kbuckets[bucketIdx] = new KBucket();
    }

    var b = this._kbuckets[bucketIdx];

    b.add(contact, this.ping.bind(this));
};

Router.prototype.ping = function(contact) {
    assert(contact instanceof Contact, 'Invalid contact provided');
    return new Promise((resolve, reject) => {
        let ping = Message.createMessage('PING', {contact: this._contact});
        let RTT = Date.now();
        this._rpc.sendAsync(ping, contact).then(()=>{
                resolve(Date.now()-RTT);
            });
    });
};

Router.prototype.clean = function() {
    this._kbuckets = [];
};

Router.prototype.size = function() {
    var total = 0;
    _.each(this._kbuckets, (val) => total+=val.length);
    return total;
};

Router.prototype._iterativeFind = function(state, contacts) {
    return new Promise((resolve, reject) => {
        return resolve();
    });
};

Router.prototype._getNearestContacts = function(key, limit, nodeID) {
    var nearest = [];
    limit = Math.min(limit, this.size());
    return this._kbuckets[0].getN(limit);
    for (let i = 0; i < this._kbuckets.length && nearest.length < limit; ++i) {
        nearest = nearest.concat(this._kbucket[i].getN(limit-nearest.length));
    }
    return nearest;
};

module.exports = Router;
