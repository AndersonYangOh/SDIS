'use strict';

const dgram = require('dgram');
const Promise = require('bluebird');

const RPC = require('../rpc.js');

class UDPTransport extends RPC {
    constructor(contact) {
        super(contact);

        this._connected = false;
        this._socket = undefined;
    }
    _open() {
        return new Promise((resolve, reject) => {
            let port = this._contact.port;
            if (this._connected) return resolve(port);

            this._socket = dgram.createSocket('udp4');
            this._socket.on('message', (buffer, remote) => {
                this.receive(buffer, remote);
            });
            this._socket.on('listening', () => {
                console.log("UDP Socket open on port:",port);
                this._connected = true;
                resolve(port);
            });
            this._socket.on('error', (err) => {
                console.error("UDP Socket couldn't open on port:",port);
                reject(err);
            });
            this._socket.bind(port);
            return undefined;
        });
    }
    _close() {
        this._socket.close();
    }
    _send(message, contact) {
        this._socket.send(message, 0, message.length, contact.port, contact.address);
    }
}

module.exports = UDPTransport;
