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
const Key = require('./key.js');
const EError = require('./error.js');


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
        limit: constants.ALPHA,
        shortList: [],
        closestNode: undefined,
        closestNodeDistance: undefined,
        prevClosestNode: undefined,
        contacted: {}
    };
    state.shortList = this._getNearestContacts(key, state.limit, this._contact.nodeID);
    state.closestNode = _.head(state.shortList);

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

Router.prototype.removeContact = function(contact) {
};

Router.prototype.ping = function(contact) {
    assert(contact instanceof Contact, 'Invalid contact provided');
    let ping = Message.createMessage('PING', {contact: this._contact});
    let RTT = Date.now();
    return this._rpc.sendAsync(ping, contact).then(()=>{
        return Date.now()-RTT;
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
    console.log("Iteration");
    return Promise.map(contacts, (contact) => {
        return this._queryContact(state, contact)
            .then((res) => {
                this._handleFindResult(state, res, contact);
            }).catchReturn(Promise.TimeoutError);
    }).then(() => {
        return this._handleQueryResults(state);
    });
};

Router.prototype._queryContact = function(state, contact) {
    let find = Message.createMessage('FIND_'+state.type, {key: state.key, contact: this._contact});

    return this._rpc
        .sendAsync(find, contact)
        .catch(Promise.TimeoutError, (err) => {
            global.log.warning("Contact didn't respond, removing...\n"+contact);
            state.shortList = _.reject(state.shortList, (c) => { return c.equals(contact); });
            this.removeContact(contact);
            throw err;
        });
};

Router.prototype._handleFindResult = function(state, res, contact) {
    let dist = state.key.distance(contact.nodeID);

    state.contacted[contact.nodeID.key] = contact;

    if (Key.compare(dist, state.closestNodeDistance) < 0) {
        state.prevClosestNode = state.closestNode;
        state.closestNode = contact;
        state.closestNodeDistance = dist;
    }

    if (state.type === 'NODE') {
        let new_nodes = _.map(res.result.nodes, (c) => { return new Contact(c); });
        let tmp = state.shortList.concat(new_nodes);
        state.shortList = _.uniqWith(tmp, Contact.equals);
    }
};

Router.prototype._handleQueryResults = function(state) {
    let noneCloser = state.closestNode.equals(state.prevClosestNode);
    let full = state.shortList.length >= constants.K;

    let remaining = _.reject(state.shortList, (c) => {
        return state.contacted[c.nodeID.key];
    });

    if (noneCloser || full) {
        return state.shortList;
    }

    if (remaining.length === 0) {
        return state.shortList;
    }

    return this._iterativeFind(state, _.slice(remaining,0,constants.ALPHA));
};

Router.prototype._getNearestContacts = function(key, limit, nodeID) {
    var nearest = [];
    limit = Math.min(limit, this.size());
    return this._kbuckets[0].getN(limit);
    // for (let i = 0; i < this._kbuckets.length && nearest.length < limit; ++i) {
    //     nearest = nearest.concat(this._kbucket[i].getN(limit-nearest.length));
    // }
    // return nearest;
};

class EmptyNetworkError extends EError {}

module.exports = Router;
module.exports.EmptyNetworkError = EmptyNetworkError;
