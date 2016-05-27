'use strict';

const net = require('net');
const assert = require('assert');
const Promise = require('bluebird');

const EOS_TOKEN = '_EOS_TOKEN_';

class DataServer {
    constructor({ contact, data, manual = true }) {
        assert(!manual, "Please use transfer.createServer()");

        this.contact = contact;
        this.data = data;
    }
    setData(data) {this.data = data;}
    listen() {
        if (!this.data) throw new ReferenceError("Server has no data to serve");
        this._createSocket();
        return this._listen();
    }
    _createSocket() {}
    _listen() {}
}

class DataClient {
    constructor({ contact, manual = true }) {
        assert(!manual, "Please use transfer.createClient()");
        assert(contact, "No contact provided");

        this.contact = contact;
    }
    connect() {
        return this._connect();
    }
    _connect() {}
}


class TCPDataServer extends DataServer {
    constructor({ contact, data, manual = true }) {
        super({contact:contact,data:data,manual:manual});
        this.clients = 0;
    }
    _createSocket() {
        let timeout;
        this.buffer = JSON.stringify(this.data)+EOS_TOKEN;
        this.socket = net.createServer(client => {
            clearTimeout(timeout);
            client.setEncoding('utf8');
            let [address, port] = [client.remoteAddress, client.remotePort];
            console.log("Client connected "+address+":"+port);
            ++this.clients;

            client.on('error', err => {
                console.log("Error in "+address+":"+port);
                Promise.reject(err);
            });
            client.on('end', () => {
                console.log("Client disconnected "+address+":"+port);
                if (--this.clients <= 0) {
                    timeout = setTimeout(() => {this.socket.close();}, 500);
                }
            });
            client.write(this.buffer);
        });
        this.socket.on('error', err => Promise.reject(err));
        this.socket.on('close', () => { console.log("Closed data server ", this.contact);});
    }

    _listen() {
        return new Promise((resolve, reject) => {
            const { address="127.0.0.1", port=0 } = this.contact;

            this.socket.listen(port, address, () => {
                const { address:addr, port:p } = this.socket.address();
                this.contact = {address:addr, port:p};

                console.log("Created data server ", this.contact);
                return resolve(this.contact);
            });
        });
    }
}

class TCPDataClient extends DataClient {
    constructor({ contact, manual = true }) {
        super({contact:contact, manual:manual});
    }
    _connect() {
        this.buffer = '';
        const { address, port } = this.contact;

        let socket = net.createConnection(port, address, () => {
            console.log("Connecting to TCP server: ", this.contact);
        });
        socket.setEncoding('utf8');

        return new Promise((resolve, reject) => {
            socket.on('error', err => reject(err));
            socket.on('data', data => {
                if (data.slice(-EOS_TOKEN.length) === EOS_TOKEN) {
                    this.buffer += data.slice(0, -EOS_TOKEN.length);
                    socket.end();
                    console.log("Disconnecting from TCP server: ", this.contact);
                    const data2 = JSON.parse(this.buffer);
                    resolve(data2);
                }
                else this.buffer += data;
            });
            socket.on('end', () => {
                console.log("Disconnecting from TCP server: ", this.contact);
            });
        });
    }
}

module.exports = {
    createServer: (type, port, address, data) => {
        type = type || 'tcp';
        switch(type) {
        case 'tcp':
            return new TCPDataServer({contact: {address:address,port:port}, data:data, manual:false});
        default:
            throw new TypeError("Invalid server type " + type);
        }
    },
    createClient: (type, port, address) => {
        type = type || 'tcp';
        switch(type) {
        case 'tcp':
            return new TCPDataClient({contact: {address:address,port:port}, manual:false});
        default:
            throw new TypeError("Invalid client type " + type);
        }
    }
};
