'use strict';

var inherits = require('util').inherits;
var events = require('events');
var dgram = require('dgram');
var assert = require('assert');

var Contact = require('./contact.js');

function RPC(contact) {
    events.EventEmitter.call(this);
    assert(contact instanceof Contact, 'Invalid contact: '+contact);

    this._contact = contact;
}

inherits(RPC, events.EventEmitter);

RPC.prototype.open = function(callback) {
    var self = this;

    function createSocket(port) {
        self._socket = dgram.createSocket('udp4');
        self._socket.on('message', (message, remote) => {
            self.receive(message);
        });
        self._socket.on('listening', callback);
        self._socket.on('error', (err) => { self.emit('error', err); });
        self._socket.bind(port);
    }

    createSocket(self._contact.port);
};

RPC.prototype.close = function(callback) {
    var self = this;
    this._socket.close();
};

RPC.prototype.send = function(message, contact) {
    var self = this;

    this._socket.send(message, 0, message.length, contact.port, contact.address);
};

RPC.prototype.receive = function(buffer) {
    var self = this;
    console.log("Received: " + buffer);
};

module.exports = RPC;
