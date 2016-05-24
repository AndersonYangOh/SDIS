'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const Promise = require('bluebird');
const chalk = require('chalk');

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

        const connectToSeed = () => {
            this._rpc.removeAllListeners('incoming');
            this._rpc.on('incoming', this.incoming.bind(this));
            if (seed) {
                this._router.addContact(seed);
                return;
                // return this._router.ping(seed);
            }
            else throw new ReferenceError("No seed provided");
        };

        const findSelf = (RTT) => {
            return this._router.findNode(this.id);
        };

        return this._rpc.open()
            .then(connectToSeed)
            .then(findSelf)
            .then((nodes) => {
                if (nodes.length === 0) {
                    throw new Router.EmptyNetworkError("Couldn't find any nodes using given seed");
                }
                return nodes;
            })
            .catch(ReferenceError, (err) => {
                global.log.warning(err.toString());
                return;
            })
            .catch(Router.EmptyNetworkError, (err) => {
                global.log.warning(err.toString());
                return;
            })
            .catch((err) => {
                global.log.error("Error bootstraping\n", err);
                this.disconnect();
                throw err;
            });
    }
    disconnect() {
        this._rpc.close();
        this._router.clean();
    }
    incoming(message, remote) {
        var remote_contact = new Contact(remote);
        if (remote_contact.equals(message.contact)) {
            this._router.addContact(remote_contact);
        }
        if (message.isRequest()) {
            let contact = new Contact(message.params.contact);
            switch (message.method) {
            case 'PING':
                // global.log.info("Received PING from: " + contact);
                let pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.send(pong, contact);
                break;

            case 'FIND_NODE':
                let nearest = this._router._getNearestContacts(message.params.key, constants.K, contact);
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
