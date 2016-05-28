'use strict';

const Promise = require('bluebird');
const EventEmitter = require('events');
const assert = require('assert');
const chalk = require('chalk');

const Contact = require('./contact.js');
const Message = require('./message.js');

class RPC extends EventEmitter {
    constructor(contact) {
        assert(contact instanceof Contact, 'Invalid contact: '+contact);
        super();

        this._contact = contact;
        this._pending = new Map();
        this._connected = false;
        this._connecting = false;
    }
    open() {
        return this._open();
    }
    close(callback) {
        this._pending = new Map();
        this._close();
    }
    send(message, contact, callback) {
        assert(message instanceof Message, 'Invalid message provided');
        assert(contact instanceof Contact, 'Invalid contact provided');

        if (message.isRequest() && typeof callback === 'function') {
            this._pending.set(message.id, {
                timeStamp: Date.now(),
                callback: callback
            });
        }
        else if (message.isResponse() && typeof callback === 'function')
            callback();

        this._send(message.serialize(), contact);
    }
    sendAsync(message, contact) {
        return new Promise((resolve, reject) => {
            this.send(message, contact, function(err, msg) {
                if (err) return reject(err);
                return resolve(msg);
            });
        })
            .timeout(5000).catch(Promise.TimeoutError, (e) => {
                global.log.error("Didn't get response in time for message:", message.method);
                this._pending.delete(message.id);
                throw e;
            });
    }
    receive(buffer, remote) {
        assert(buffer instanceof Buffer, 'Invalid buffer received');

        let message = Message.fromBuffer(buffer);

        let type = message.isRequest() ? 'REQUEST' : 'RESPONSE';

        if (message.isResponse() && this._pending.has(message.id)) {
            this._pending.get(message.id).callback(null, message);
            this._pending.delete(message.id);
        }

        this.emit('incoming', message, remote);
    }

    // Methods must be implemented by child classes
    _open() {}
    _close() {}
    _send() {}
}

module.exports = RPC;
