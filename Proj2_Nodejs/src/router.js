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
        this._kbuckets = new Map();
    }
    get length() { return this._size(); }
    get buckets() { return this._kbuckets; }

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
            contacted: new Map()
        };
        state.shortList = this.getNearestContacts(key, state.limit, this._contact.nodeID);
        state.closestNode = _.head(state.shortList);

        if (!state.closestNode) throw new Error('Not connected to any peers');

        state.closestNodeDistance = Key.distance(key, state.closestNode.nodeID);

        return this._iterativeFind(state, state.shortList);
    }

    addContact(contact) {
        assert(contact instanceof Contact, 'Invalid contact provided');

        if (contact.equals(this._contact)) return;

        let bucketIdx = Key.prefix(this._contact.nodeID, contact.nodeID);
        assert(bucketIdx < constants.B, 'Bucket index cannot exceed B('+constants.B+')');

        // console.log(contact+"\n"+this._contact+"\n"+bucketIdx);

        if (!this._kbuckets.has(bucketIdx)) {
            this._kbuckets.set(bucketIdx, new KBucket());
        }

        var b = this._kbuckets.get(bucketIdx);

        b.add(contact, this.ping.bind(this));
    }

    removeContact(contact) {
        assert(contact instanceof Contact, 'Invalid contact provided');

        var bucketIdx = Key.prefix(this._contact.nodeID, contact.nodeID);
        assert(bucketIdx < constants.B, 'Bucket index cannot exceed B('+constants.B+')');

        var b = this._kbuckets.get(bucketIdx);
        if (!b) return false;

        b.remove(contact);
        return true;
    }

    ping(contact) {
        assert(contact instanceof Contact, 'Invalid contact provided');
        let ping = Message.createMessage('PING', {contact: this._contact});
        let RTT = process.hrtime();
        return this._rpc.sendAsync(ping, contact).then(()=>{
            return process.hrtime(RTT);
        });
    }

    clean() {
        this._kbuckets = new Map();
    }

    getNearestContacts(key, limit, nodeID) {
        assert(nodeID instanceof Key);
        let nearest = [];
        let prefix = Key.prefix(this._contact.nodeID, key);

        let addNearest = (bucket) => {
            if (!bucket) return;
            let toAdd = _.chain(bucket.nearest(key))
                .reject(c => c.nodeID.equals(nodeID))
                .slice(0, limit-nearest.length)
                .value();
            nearest = _.concat(nearest, toAdd);
        };

        for (let i = prefix; nearest.length < limit && i < constants.B; ++i) {
            addNearest(this._kbuckets.get(i));
        }

        for (let i = prefix-1; nearest.length < limit && i >= 0; --i) {
            addNearest(this._kbuckets.get(i));
        }

        // global.log.info("Me: " + this._contact);
        // console.log("Requester: " + nodeID);
        // console.log("Returning "+nearest.length+" from "+this.length+". Needed "+limit);
        // console.log(Array.from(this.buckets.keys()));
        // console.log(prefix);
        // console.log("---------------------");
        // _.each(nearest, (c) => console.log(c+""));
        // console.log("---------------------");
        // if (nearest.length < this.length && this.length < limit) {
        //     let buck = Array.from(this.buckets.values());
        //     buck = _.map(buck, b => b._contacts );
        //     buck = _.flatten(buck);
        //     buck = _.map(buck, c => { return {contact: c, distance: Key.distance(key, c.nodeID)}; });
        //     buck = buck.sort((c1,c2) => Key.compare(c1.distance, c2.distance));
        //     _.each(buck, c => console.log(c.contact+""+c.distance.readUInt8()));
        // }

        return nearest;
    }

    refreshBucket(prefix) {
        assert(prefix >= 0 && prefix < constants.B, 'Invalid prefix');

        const powerOfTwo = (idx) => {
            const nBytes = constants.B / 8;
            const byte = parseInt(idx / 8);
            let buf = new Buffer(nBytes).fill(0);

            buf[nBytes - byte - 1] = 1 << (idx % 8);
            return buf;
        };

        const getRandom = (idx) => {
            const nBytes = constants.B / 8;

            const byte = parseInt(idx / 8);
            let base = powerOfTwo(idx);

            for (let i = nBytes - 1; i > (nBytes - byte - 1); --i)
                base[i] = parseInt(Math.random() * 256);

            for (let i = idx - 1; i >= byte*8; --i) {
                const one = Math.random() >= 0.5;
                const shift = i - byte*8;

                base[nBytes - byte - 1] |= one ? (1 << shift) : 0;
            }

            return base;
        };

        const randKey = new Key(getRandom(prefix).toString('hex'));

        return this.findNode(randKey);
    }

    _iterativeFind(state, contacts) {
        const queryContact = ( { state, contact } ) => {
            let params = {key: state.key, contact: this._contact};
            let find_msg = Message.createMessage('FIND_'+state.type, params);

            return this._rpc.sendAsync(find_msg, contact).then((res) => {
                return {res, state, contact};
            });
        };
        const analyzeResponse = ({ res, state, contact }) => {
            assert(res instanceof Message, 'Invalid response');
            assert(contact instanceof Contact, 'Invalid contact');

            let dist = Key.distance(state.key, contact.nodeID);

            this.addContact(contact);
            state.contacted.set(contact.nodeID.key, contact);

            if (Key.compare(dist, state.closestNodeDistance) < 0) {
                state.prevClosestNode = state.closestNode;
                state.closestNode = contact;
                state.closestNodeDistance = dist;
            }

            if (state.type === 'NODE') {
                let new_nodes = _.map(res.result.nodes, (c) => { return new Contact(c); });
                let tmp = _.concat(state.shortList, new_nodes);
                state.shortList = _.uniqWith(tmp, (a,b) => a.equals(b));
            }

            return {state};
        };
        const handleResults = ({ state }) => {
            let noneCloser = state.closestNode.equals(state.prevClosestNode);
            // let full = state.shortList.length >= constants.K;
            let full = state.contacted.size >= constants.K;

            let remaining = _.reject(state.shortList, (c) => {
                return state.contacted.has(c.nodeID.key);
            });

            // if (noneCloser) global.log.warning("No node closer");
            // if (full) global.log.warning("List is full");
            // if (_.isEmpty(remaining)) global.log.warning("No nodes remaining");

            if (noneCloser || full || _.isEmpty(remaining)) {
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

    _size() {
        var total = 0;
        this._kbuckets.forEach(bucket => total+=bucket.length);
        return total;
    }
}

class EmptyNetworkError extends EError {}

module.exports = Router;
module.exports.EmptyNetworkError = EmptyNetworkError;
