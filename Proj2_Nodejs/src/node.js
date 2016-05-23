'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const Promise = require('bluebird');
const chalk = require('chalk');

const Contact = require('./contact.js');
const Router = require('./router.js');
const Message = require('./message.js');
const UDP = require('./transport/udp.js');

class Node extends EventEmitter{
    constructor(contact, options) {
        super();
        assert(contact instanceof Contact, 'Invalid contact provided');

        options = options || {
            transport: new UDP(contact)
        };
        this.contact = contact;
        this._rpc = options.transport;
        this._router = new Router(contact, {transport: this._rpc});
        Object.defineProperty(this, 'id', {get: function(){return this.contact.nodeID;}});
    }
    connect(seed) {
        if (seed instanceof Node) seed = seed.contact;
        return new Promise((resolve, reject) => {
            this._rpc
                .open()
                .then(() => {
                    this._rpc.removeAllListeners('incoming');
                    this._rpc.on('incoming', this.incoming.bind(this));
                    if (seed) {
                        global.log.info("Attempting to bootstrap using seed: "+seed);
                        global.log.info("Pinging seed...");
                        return this._router.ping(seed);
                    }
                    else throw new ReferenceError('NO_SEED');
                }).then((RTT) => {
                    global.log.success("Seed pinged successfully, connecting to network...");
                    // Contact should be added automaticly after PONG received
                    // this._router.addContact(seed);
                    return this._router.findNode(this.id);
                    // return resolve(RTT);
                }).catch(ReferenceError, () => {
                    global.log.warning("No seed provided");
                    return resolve();
                }).catch((err) => {
                    this.disconnect();
                    return reject(err);
                });
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
                global.log.info("Received PING from: " + contact);
                let pong = Message.fromRequest(message, {contact: this.contact});
                this._rpc.send(pong, contact);
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
