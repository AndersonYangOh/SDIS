'use strict';

const net = require('net');
const Promise = require('bluebird');
const clarinet = require('clarinet');

const RPC = require('../rpc.js');
const Contact = require('../contact.js');

class TCPTransport extends RPC {
    constructor(contact) {
        super(contact);

        this._server = undefined;
        this._queued = new Map();
    }
    _open() {
        return new Promise((resolve, reject) => {
            const port = this._contact.port;
            if (this._connected || this._connecting) return resolve(port);

            this._connecting = true;

            this._server = net.createServer(this._connHandler.bind(this));
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

        this._queued = new Map();
        this._connecting = false;
        this._connected = false;
    }
    _send(message, contact) {

        let msg_id = JSON.parse(message.toString()).id;

        if (this._queued.has(msg_id)) {
            this._queued.get(msg_id).end(message);
            this._queued.delete(msg_id);
            return;
        }

        let client = new net.createConnection(contact.port, contact.address);
        client.on('error', err =>  global.log.error(err) );

        this._queued.set(msg_id, client);
        this._connHandler(client);
        client.write(message);
    }
    _connHandler(connection) {
        // let addr = connection.address();
        // let conn_contact = new Contact(addr);

        let buffer = '';
        let jsonparser = clarinet.createStream();
        let open = 0; let close = 0;

        jsonparser.on('openobject', () => ++open);
        jsonparser.on('closeobject', () => {
            ++close;

            if (open === close) {
                try {
                    let msg_id;
                    msg_id = JSON.parse(buffer).id;
                    if (msg_id && !this._queued.has(msg_id))
                        this._queued.set(msg_id, connection);
                } catch (err) {global.log.error(err);}

                this.receive(new Buffer(buffer));
                buffer = '';
                open = close = 0;
            }
        });
        jsonparser.on('error', err => {
            global.log.error(err);
            connection.end();
        });

        connection.on('data', data => {
            buffer += data.toString();
            jsonparser.write(data.toString());
        });
        connection.on('error', err => {} );
        // connection.on('error', err => global.log.error("LOOL"+err) );
    }
}

module.exports = TCPTransport;
