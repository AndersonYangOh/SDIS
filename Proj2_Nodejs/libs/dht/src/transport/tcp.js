'use strict';

const net = require('net');
const Promise = require('bluebird');

const RPC = require('../rpc.js');
const Contact = require('../contact.js');

class TCPTransport extends RPC {
    constructor(contact) {
        super(contact);

        this._server = undefined;
    }
    _open() {
        return new Promise((resolve, reject) => {
            const port = this._contact.port;
            if (this._connected || this._connecting) return resolve(port);

            this._connecting = true;

            this._server = net.createServer((connection) => {
                let addr = connection.address();
                let conn_contact = new Contact(addr);

                let buffers = [];

                // console.log(this._contact.fullAddress()+' TCP Client connected', conn_contact.fullAddress());
                connection.on('data', (data) => {
                    buffers.push(data);
                });
                connection.on('end', () => {
                    this.receive(Buffer.concat(buffers), addr);
                    // console.log(this._contact.fullAddress(),'TCP Client disconnected', conn_contact.fullAddress());
                });
                connection.on('error', err => console.log(err) );
            });
            this._server.on('error', (err) => { return reject(err); });
            this._server.listen(port, () => {
                console.log("TCP Server listening on port "+port);
                this._connecting = false;
                this._connected = true;
                return resolve(port);
            });

            return undefined;
        });
    }
    _close() {
        if (this._connected)
            this._server.close();

        this._connecting = false;
        this._connected = false;
    }
    _send(message, contact) {
        let client = new net.Socket();
        client.connect(contact.port, contact.address, () => {
            client.write(message);
            client.end();
        });
        client.on('error', (err) => {});
        // this._socket.send(message, 0, message.length, contact.port, contact.address);
    }
}

module.exports = TCPTransport;
