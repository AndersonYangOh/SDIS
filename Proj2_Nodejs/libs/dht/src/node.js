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
            .then(({ addr, port }) => {
                console.log("Trying to get data through TCP");
                console.log(addr, port);
                return new Promise((resolve, reject) => {
                    let buf = '';
                    const EOS_TOKEN = Node.EOS_TOKEN;

                    let client = net.createConnection(port, addr);
                    client.setEncoding('utf8');

                    client.on('error', (err) => { return reject(err); });
                    client.on('data', (data) => {
                        if (data.slice(-EOS_TOKEN.length) === EOS_TOKEN) {
                            buf += data.slice(0, -EOS_TOKEN.length);
                            client.end();
                        }
                        else buf += data;
                    });
                    client.on('end', () => {
                        let data = JSON.parse(buf);
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

                let clients = 0;
                const buf = JSON.stringify(value)+Node.EOS_TOKEN;
                let server = net.createServer(connection => {
                    ++clients;

                    connection.on('error', err => { return reject(err); });
                    connection.on('end', () => {
                        if (--clients <= 0) server.close();
                    });

                    connection.write(buf);
                });
                server.on('error', err => { return reject(err); });
                server.on('close', () => { console.log("Close server use to send PUT");});
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
            const TCPContact = {addr:addr,port:port};

            return Promise.map(contacts, (c) => {
                const store_msg = Message.createMessage('STORE', {key: hashed, value: TCPContact, contact: this.contact});
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

        // if (message.isResponse()) console.log(message.result);

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
                    const value = JSON.stringify(this._storage.get(message.params.key))+Node.EOS_TOKEN;
                    let timeout, addr, port;
                    let server = net.createServer(connection => {
                        clearTimeout(timeout);
                        connection.on('error', err => { throw err; });
                        connection.on('end', () => { server.close(); });
                        connection.write(value);
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
                const { addr, port } = value;

                const pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.sendAsync(pong, contact);

                if (!this._storage.has(key)) {
                    let buf = '';
                    const EOS_TOKEN = Node.EOS_TOKEN;

                    console.log("Connecting to "+addr+":"+port+" to get data needed for store");
                    let client = net.createConnection(port, addr);
                    client.setEncoding('utf8');

                    client.on('error', (err) => { throw err; });
                    client.on('data', (data) => {
                        if (data.slice(-EOS_TOKEN.length) === EOS_TOKEN) {
                            buf += data.slice(0, -EOS_TOKEN.length);
                            client.end();
                        }
                        else buf += data;
                    });
                    client.on('end', () => {
                        let data = JSON.parse(buf);
                        this._storage.set(key, data);
                        console.log("LETS GOOO "+buf.length+" bytes");
                    });
                }
            }
        }
    }
}

module.exports = Node;
