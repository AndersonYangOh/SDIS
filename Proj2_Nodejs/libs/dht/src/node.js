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
            .then(({ addr, port }) => {
                console.log("Trying to get data through TCP");
                console.log(addr, port);
                return new Promise((resolve, reject) => {
                    let buffers = [];
                    let client = net.createConnection(port, addr);
                    client.on('error', (err) => { return reject(err); });
                    client.on('data', (data) => {
                        console.log("Whoop "+data.length+" bytes");
                        buffers.push(data);
                    });
                    client.on('close', () => {
                        let buf = Buffer.concat(buffers);
                        console.log("Assembling packets... "+buf.length+" bytes");
                        let data = JSON.parse(buf.toString('utf8'));
                        return resolve(data);
                    });
                });
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
            return new Promise((resolve, reject) => {
                if (_.isEmpty(contacts)) return reject(Router.EmptyNetworkError());

                const buf = new Buffer(JSON.stringify(value), 'utf8');
                let server = net.createServer(connection => {
                    connection.on('error', err => { return reject(err); });

                    connection.write(buf);
                    connection.end();
                    connection.destroy();
                });
                server.on('error', err => { return reject(err); });
                server.listen(0, '127.0.0.1', () => {
                    const addr = server.address().address;
                    const port = server.address().port;

                    console.log("Created server to send data at "+addr+":"+port);
                    return resolve({contacts, server});
                });

                return undefined;
            });
        };
        const sendStoreToContacts = ({ contacts, server }) => {
            const { address:addr, port } = server.address();
            const store_msg = Message.createMessage('STORE', {key: hashed, value: {addr:addr, port:port}, contact: this.contact});

            let stores = Promise.map(contacts, (c => {
                console.log("OMFG");
                return this._rpc.sendAsync(store_msg, c)
                    .then(res => {
                        console.log("fuck this");
                        return res.contact;
                    });
            }));

            return stores.then(responses => {
                server.close();
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

        if (message.isResponse()) console.log(message.result);

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
                    const value = new Buffer(JSON.stringify(this._storage.get(message.params.key)), 'utf8');
                    let timeout, addr, port;
                    let server = net.createServer(connection => {
                        clearTimeout(timeout);
                        console.log(value.length,"bytes");
                        connection.on('error', err => { throw err; });
                        connection.write(value);
                        connection.end();
                        connection.destroy();
                        server.close();
                    });
                    server.on('error', err => { throw err; });
                    server.on('close', () => { console.log("Closed TCP server",addr,port); });
                    server.listen(0, '127.0.0.1', () => {
                        timeout = setTimeout(()=>{ console.log("Timeout"); server.close(); }, 500);
                        addr = server.address().address;
                        port = server.address().port;
                        console.log("Created TCP server to send data", addr, port);
                        const res = Message.fromRequest(message, {value: {addr,port}, contact: this.contact});
                        this._rpc.sendAsync(res, contact);
                    });
                }
                else sendNearest(message.params.key);
            }

            else if (message.method === 'STORE') {
                const { key, value } = message.params;
                // if (!this._storage.has(key)) {
                //     this._storage.set(key, value);
                // }
                const { addr, port } = value;

                const pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.sendAsync(pong, contact);

                if (!this._storage.has(key)) {
                    let buffers = [];

                    console.log("Connecting to "+addr+":"+port+" to get data needed for store");
                    let client = net.createConnection(port, addr);
                    client.on('error', (err) => { throw err; });
                    client.on('data', (data) => {
                        console.log("Whoop "+data.length+" bytes");
                        buffers.push(data);
                    });
                    client.on('end', () => {
                        console.log("LETS GOOO");
                        let buf = Buffer.concat(buffers);
                        let data = JSON.parse(buf.toString('utf8'));
                        this._storage.set(key, value);
                    });
                }
            }
        }
    }
}

module.exports = Node;
