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

class Router extends EventEmitter {
    constructor(contact, { transport }) {
        assert(contact instanceof Contact, 'Invalid contact provided');
        assert(transport, 'Invalid transport provided');
        super();

        this._rpc = transport;
        this._contact = contact;
        this._kbuckets = {};
    }
    get length() { return this._size(); }

    findNode(key) {
        return this.lookup('NODE', key);
    }

    findValue(key) {
        return this.lookup('VALUE', key);
    }

    lookup(type, key) {
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
    }

    addContact(contact) {
        var bucketIdx = 0;

        if (!this._kbuckets[bucketIdx]) {
            this._kbuckets[bucketIdx] = new KBucket();
        }

        var b = this._kbuckets[bucketIdx];

        b.add(contact, this.ping.bind(this));
    }

    removeContact(contact) {
    }

    ping(contact) {
        assert(contact instanceof Contact, 'Invalid contact provided');
        let ping = Message.createMessage('PING', {contact: this._contact});
        let RTT = Date.now();
        return this._rpc.sendAsync(ping, contact).then(()=>{
            return Date.now()-RTT;
        });
    }

    clean() {
        this._kbuckets = [];
    }

    _iterativeFind(state, contacts) {
        const queryContact = ( { state, contact } ) => {
            let params = {key: state.key, contact: this._contact};
            let find_msg = Message.createMessage('FIND_'+state.type, params);

            return this._rpc.sendAsync(find_msg, contact).then((res) => {
                return {res, state, contact};
            });
        };
        const analyzeResponse = ({res, state, contact }) => {
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

            return {state};
        };
        const handleResults = ({ state }) => {
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

        const handleNoResponse = ({err, state, contact }) => {
            global.log.warning("Contact didn't respond, removing...\n"+contact);
            state.shortList = _.reject(state.shortList, (c) => { return c.equals(contact); });
            this.removeContact(contact);
            throw err;
        };

        return Promise.map(contacts, (contact) => {
            return queryContact({state, contact})
                .then(analyzeResponse)
                .catch(Promise.TimeoutError, _.partial(handleNoResponse, {state,contact}));
        }).then((res) => {
            return handleResults({state});
        });
    }

    _getNearestContacts(key, limit, nodeID) {
        var nearest = [];
        limit = Math.min(limit, this.length);
        return this._kbuckets[0].getN(limit);
        // for (let i = 0; i < this._kbuckets.length && nearest.length < limit; ++i) {
        //     nearest = nearest.concat(this._kbucket[i].getN(limit-nearest.length));
        // }
        // return nearest;
    }

    _size() {
        var total = 0;
        _.each(this._kbuckets, (val) => total+=val.length);
        return total;
    }
}

class EmptyNetworkError extends EError {}

module.exports = Router;
module.exports.EmptyNetworkError = EmptyNetworkError;
