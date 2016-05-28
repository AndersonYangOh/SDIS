'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const Promise = require('bluebird');
const chalk = require('chalk');
const _ = require('lodash');
const net = require('net');

const Contact = require('./contact.js');
const Router = require('./router.js');
const Message = require('./message.js');
const TCP = require('./transport').TPC;
const UDP = require('./transport').UDP;
const utils = require('./utils.js');
const constants = require('./constants.js');
const transfer = require('./transfer.js');

class Node extends EventEmitter {
    constructor(contact, { transport } = {}) {
        super();

        if (!(contact instanceof Contact)) contact = new Contact(contact);
        transport = transport || new UDP(contact);

        this.contact = contact;
        this._rpc = transport;
        this._router = new Router(contact, {transport: this._rpc});
        this._storage = new Map();
    }
    get id() {return this.contact.nodeID;}

    static get EOS_TOKEN() {return '_EOS_TOKEN_';}

    connect(seed) {
        if (seed instanceof Node) seed = seed.contact;
        else if (typeof seed == 'object') seed = new Contact(seed);

        // Main chain
        const openRPC = () => {
            return this._rpc.open();
        };
        const connectToSeed = () => {
            this._rpc.removeAllListeners('incoming');
            this._rpc.on('incoming', this._incoming.bind(this));
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

    get(key) {
        const hashed = utils.createID(key);
        if (this._storage.has(hashed)) return Promise.resolve(this._storage.get(hashed));

        return this._router.findValue(hashed)
            .then(({ address, port }) => {
                console.log("Trying to GET data through TCP",address,port);
                let client = transfer.createClient('tcp', port, address);
                return client.connect();
            });
    }

    put(key, data) {
        const hashed = utils.createID(key);
        const value = { key: key, data: data };

        const handleContacts = (res) => {
            if (_.isEmpty(res)) throw new Router.EmptyNetworkError();
            return _.slice(res, 0, constants.K);
        };
        const getLocalContacts = (err) => {
            return this._router.getNearestContacts(hashed, constants.K, this.contact.nodeID);
        };
        const createServer = (contacts) => {
            if (_.isEmpty(contacts)) throw new Router.EmptyNetworkError();

            let server = transfer.createServer('tcp', 0, this.contact.address);
            server.setData(value);

            return server.listen()
                .then(server_contact => {
                    return {contacts, server_contact};
                });
        };
        const sendStoreToContacts = ({ contacts, server_contact }) => {
            return Promise.map(contacts, (c) => {
                const store_msg = Message.createMessage('STORE', {key: hashed, value: server_contact, contact: this.contact});
                return this._rpc.sendAsync(store_msg, c).then((res) => {
                    return res.contact;
                });
            }).then(responses => {
                return responses;
            });
        };
        const handleResponses = (responses) => {
            console.log(responses.length+" contacts have stored the value.");
            if (responses.length < 3 && !this._storage.has(hashed)) {
                this._storage.set(hashed, value);
                responses.push(this.contact);
            }
            return {value: value, responses: responses, replDeg: responses.length};
        };

        return this._router.findNode(hashed)
            .then(handleContacts)
            .catch(Router.EmptyNetworkError, getLocalContacts)
            .then(createServer)
            .then(sendStoreToContacts)
            .then(handleResponses);
    }

    ping(arg) {
        let contact;
        if (arg instanceof Node) contact = arg.contact;
        else if (arg instanceof Contact) contact = arg;
        else contact = new Contact(arg);

        global.log.info("Pinging "+contact);
        return this._router.ping(contact);
    }

    _incoming(message, remote) {
        const remote_contact = new Contact(remote);

        let contact = message.contact;
        this._router.addContact(contact);

        if (message.isRequest()) {

            const sendNearest = (key) => {
                const nearest = this._router.getNearestContacts(key, constants.K, contact.nodeID);
                const res = Message.fromRequest(message, {nodes: nearest, contact: this.contact});
                this._rpc.sendAsync(res, contact);
            };

            if (message.method === 'PING') {
                // global.log.info("Received PING from: " + contact);
                const pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.sendAsync(pong, contact);
            }

            else if (message.method === 'FIND_NODE') {
                sendNearest(message.params.key);
            }

            else if (message.method === 'FIND_VALUE') {
                if (this._storage.has(message.params.key)) {
                    let server = transfer.createServer('tcp', 0, this.contact.address);
                    server.setData(this._storage.get(message.params.key));

                    server.listen()
                        .then(server_contact => {
                            const res = Message.fromRequest(message, {value: server_contact, contact: this.contact});
                            this._rpc.sendAsync(res, contact);
                        });
                }
                else sendNearest(message.params.key);
            }

            else if (message.method === 'STORE') {
                const { key, value } = message.params;
                const { address, port } = value;

                const pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.sendAsync(pong, contact);

                if (!this._storage.has(key)) {
                    let client = transfer.createClient('tcp', port, address);
                    client.connect()
                        .then(data => {
                            console.log("Whoop");
                            this._storage.set(key, data);
                        });
                }
            }
        }
    }
}

module.exports = Node;
