'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const Promise = require('bluebird');
const chalk = require('chalk');
const _ = require('lodash');

const Contact = require('./contact.js');
const Router = require('./router.js');
const Message = require('./message.js');
const UDP = require('./transport/udp.js');
const constants = require('./constants.js');

class Node extends EventEmitter {
    constructor(contact, { transport } = {}) {
        super();

        if (!(contact instanceof Contact)) contact = new Contact(contact);
        transport = transport || new UDP(contact);

        this.contact = contact;
        this._rpc = transport;
        this._router = new Router(contact, {transport: this._rpc});
    }
    get id() {return this.contact.nodeID;}

    connect(seed) {
        if (seed instanceof Node) seed = seed.contact;
        else if (typeof seed == 'object') seed = new Contact(seed);

        // Main chain
        const openRPC = () => {
            return this._rpc.open();
        };
        const connectToSeed = () => {
            this._rpc.removeAllListeners('incoming');
            this._rpc.on('incoming', this.incoming.bind(this));
            if (seed && !seed.equals(this.contact)) {
                this._router.addContact(seed);
                return;
                // return this._router.ping(seed);
            }
            else throw new ReferenceError("No seed provided");
        };
        const findSelfInNetwork = (RTT) => {
            return this._router.findNode(this.id);
        };
        const handleNodes = (nodes) => {
            if (nodes.length === 0) {
                throw new Router.EmptyNetworkError("Couldn't find any nodes using given seed");
            }
            return this;
        };
        const refreshBuckets = (ret) => {
            const prefixes = Array.from(this._router.buckets.keys());
            const min = _.min(prefixes);

            const bucketsToRefresh = _.chain(prefixes)
                  .filter(i => i >= min)
                  .values();

            return Promise.mapSeries(bucketsToRefresh, (prefix) => {
                return this._router.refreshBucket(prefix);
            }).return(ret);
        };

        // Error handling
        const handleNoSeed = (err) => {
            // global.log.warning(err.toString());
            return this;
        };
        const handleEmptyNetwork = (err) => {
            global.log.warning(err.toString());
            return this;
        };
        const handleExceptions = (e) => {
            global.log.error("Error bootstraping\n", e);
            this.disconnect();
            throw e;
        };

        // Bootstrap chain
        return openRPC()
            .then(connectToSeed)
            .then(findSelfInNetwork)
            .then(handleNodes)
            .then(refreshBuckets)
            .catch(ReferenceError, handleNoSeed)
            .catch(Router.EmptyNetworkError, handleEmptyNetwork)
            .catch(handleExceptions);
    }
    disconnect() {
        this._rpc.close();
        this._router.clean();
    }
    incoming(message, remote) {
        var remote_contact = new Contact(remote);
        this._router.addContact(remote_contact);

        if (message.isRequest()) {
            let contact = new Contact(message.params.contact);

            switch (message.method) {
            case 'PING':
                // global.log.info("Received PING from: " + contact);
                let pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.send(pong, contact);
                break;

            case 'FIND_NODE':
                let nearest = this._router.getNearestContacts(message.params.key, constants.K, contact.nodeID);
                let res = Message.fromRequest(message, {nodes: nearest, contact: this.contact});
                this._rpc.sendAsync(res, contact);
                break;
            }
        }
    }
    ping(contact) {
        if (contact instanceof Node) contact = contact.contact;
        global.log.info("Pinging "+contact);
        return this._router.ping(contact);
    }
}

module.exports = Node;
