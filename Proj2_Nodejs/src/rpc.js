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
        this._pending = {};
    }
    open() {
        return this._open();
    }
    close(callback) {
        this._close();
    }
    send(message, contact, callback) {
        assert(message instanceof Message, 'Invalid message provided');
        assert(contact instanceof Contact, 'Invalid contact provided');

        if (message.isRequest() && typeof callback === 'function') {
            this._pending[message.id] = {
                timeStamp: Date.now(),
                callback: callback
            };
        }

        this._send(message.serialize(), contact);
    }
    sendAsync(message, contact) {
        return new Promise(function (resolve, reject) {
            this.send(message, contact, function(err, msg) {
                if (err) return reject(err);
                return resolve(msg);
            });
        }.bind(this));
    }
    receive(buffer, remote) {
        assert(buffer instanceof Buffer, 'Invalid buffer received');

        let message = Message.fromBuffer(buffer);

        let type = message.isRequest() ? 'REQUEST' : 'RESPONSE';
        console.log(chalk.black.bgGreen("Received "+type+" from ")+chalk.black.bgBlue(new Contact(remote)));
        console.log(message);

        let pending = this._pending[message.id];
        if (message.isResponse() && pending) {
            pending.callback(null, message);
            delete this._pending[message.id];
        }

        this.emit('incoming', message, remote);
    }

    // Methods must be implemented by child classes
    _open() {}
    _close() {}
    _send() {}
}

module.exports = RPC;
