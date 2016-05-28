'use strict';

const dgram = require('dgram');
const Promise = require('bluebird');

const RPC = require('../rpc.js');

class UDPTransport extends RPC {
    constructor(contact) {
        super(contact);

        this._socket = undefined;
    }
    _open() {
        return new Promise((resolve, reject) => {
            let port = this._contact.port;
            if (this._connected || this._connecting) return resolve(port);

            this._connecting = true;
            this._socket = dgram.createSocket('udp4');
            this._socket.on('message', (buffer, remote) => {
                this.receive(buffer, remote);
            });
            this._socket.on('listening', () => {
                // console.log("UDP Socket open on port:",port);
                this._connecting = false;
                this._connected = true;
                resolve(port);
            });
            this._socket.on('error', (err) => {
                // console.error("UDP Socket couldn't open on port:",port);
                reject(err);
            });
            this._socket.bind(port, '0.0.0.0');
            return undefined;
        });
    }
    _close() {
        if (this._connected)
            this._socket.close();

        this._connecting = false;
        this._connected = false;
    }
    _send(message, contact) {
        this._socket.send(message, 0, message.length, contact.port, contact.address);
    }
}

module.exports = UDPTransport;
