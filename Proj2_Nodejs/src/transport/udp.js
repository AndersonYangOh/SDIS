'use strict';

const dgram = require('dgram');

const RPC = require('../rpc.js');

class UDPTransport extends RPC {
    constructor(contact) {
        super(contact);

        this._socket = undefined;
    }
    _open() {
        var self = this;

        function createSocket(port) {
            self._socket = dgram.createSocket('udp4');
            self._socket.on('message', (buffer, remote) => {
                self.receive(buffer, remote);
            });
            self._socket.on('listening', () => {
                console.log("UDP Socket open on port:",port);
                self.emit('ready');
            });
            self._socket.on('error', (err) => {
                console.error("UDP Socket couldn't open on port:",port);
                self.emit('ready', err);
            });
            self._socket.bind(port);
        }

        createSocket(self._contact.port);
    }
    _close() {
        this._socket.close();
    }
    _send(message, contact) {
        this._socket.send(message, 0, message.length, contact.port, contact.address);
    }
}

module.exports = UDPTransport;
