'use strict';

const Promise = require('bluebird');
const DHT = require('../libs/dht');
const _ = require('lodash');
const minimist = require('minimist');
const readline = require('readline');
const hat = require('hat');
const crypto = require('crypto');
const path = require('path');

const File = require('./file.js');

global.log = DHT.Logger;

class Peer {
    constructor({ contact } = {}) {
        this._node = new DHT.Node(new DHT.Contact(contact));
    }

    connect(arg1) {
        let contact = arg1;
        if (arg1 instanceof Peer) contact = arg1._node.contact;

        return this._node.connect(contact).then(()=>console.log("Connected to ",this._node._router.length)).return(this);
    }

    disconnect() {
        this._node.disconnect();
    }

    get(filename, password) {
        const getMetaData = (filename) => {
            return this._node.get(filename);
        };
        const handleMetaData = ({ key, data }) => {
            const metadata = JSON.parse(data);
            console.log(metadata);
            if (metadata.encrypted && !password) throw new Error("No password provided for encrypted file");
            return metadata;
        };
        const getFile = (metadata) => {
            return this._node.get(metadata.filekey)
                .then( ({ key, data }) => {
                    return {metadata: metadata, received: {key:key, data:data}};
                });
        };
        const checkIntegrity = ({ metadata, received }) => {
            if (metadata.filekey !== received.key) throw new Error("Keys don't match");

            const data = File.deserialize(received.data);
            const checksum = crypto.createHash('md5').update(data).digest('hex');

            if (checksum !== metadata.checksum) throw new Error("CHECKSUM doesn't match");

            return {metadata: metadata, data: data};
        };
        const decryptContents = ({ metadata, data }) => {
            if (password && metadata.encrypted) {
                global.log.info('Password detected. Decrypting contents...');
                let decipher = crypto.createDecipher('aes-256-ctr', password);
                let decrypted = decipher.update(data);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                return {metadata:metadata, file:decrypted};
            }
            return {metadata: metadata, file:data};
        };
        const saveFile = ({ metadata, file }) => {
            const saveName = metadata.name+".bk"+metadata.extension;
            return File.saveFile(file, saveName);
        };

        return getMetaData(filename)
            .then(handleMetaData)
            .then(getFile)
            .then(checkIntegrity)
            .then(decryptContents)
            .then(saveFile)
            .catch((err) => {DHT.Logger.error("Failed to get "+filename+". Reason: ",err);});
    }

    put(filepath, password) {
        const encryptContents = ({ info, data }) => {
            if (password) {
                global.log.info('Password detected. Encrypting contents...');
                let cipher = crypto.createCipher('aes-256-ctr', password);
                let crypted = cipher.update(data);
                crypted = Buffer.concat([crypted, cipher.final()]);
                return {info:info, data:crypted};
            }
            return {info:info, data:data};
        };
        const createMetaData = ({ info, data }) => {
            const randKey = hat.rack(160)()+info.path.base+info.stat.ctime.getTime();
            const metadata = {
                name: info.path.name,
                base: info.path.base,
                extension: info.path.ext,
                encrypted: !!(password),
                filekey: crypto.createHash('sha1').update(randKey).digest('hex'),
                checksum: crypto.createHash('md5').update(data).digest('hex')
            };
            return this._node.put(metadata.base, JSON.stringify(metadata))
                .return({key: metadata.filekey, data: data});
        };
        const backupFile = ({ key, data }) => {
            const serialized = File.serialize(data);
            return this._node.put(key, serialized);
        };

        return File.loadFile(filepath)
            .then(encryptContents)
            .then(createMetaData)
            .then(backupFile)
            .catch(err => {
                global.log.error(err);
            });
    }

}

const createPeers = ({ address, port }, n) => {
    let peers = _.times(n, (i) => { return new Peer({contact: {address: address, port: port+i}}); });
    return Promise.map(peers, peer => peer.connect());
};

const createNetwork = (peers) => {
    return Promise.map(peers, (node, i) => {
        return peers[i].connect(peers[i+1]).then((peer)=>{
            DHT.Logger.success("Peer "+(i+1)+" connected");
            return peer;
        });
    });
};

const argv = minimist(process.argv.slice(2));
console.log(argv);

let contact_regex = /(?:(\d{1,3}(?:\.\d{1,3}){3}):)?(\d+)/;
if (!contact_regex.test(argv._[0])) throw new TypeError("Invalid contact provided");

const tmp = contact_regex.exec(argv._[0]);

let contact = {
    address: tmp[1] || '127.0.0.1',
    port: Number(tmp[2])
};

let peer;
if (argv.j) {
    const addr = argv.j.split(':')[0];
    const port = Number(argv.j.split(':')[1]);
    peer = new Peer({contact: contact});
    peer.connect({address: addr, port: port});
}
else if (argv.n) {
    const num = Number(argv.n);
    createPeers(contact, num)
        .then(createNetwork)
        .then(peers => {
            _.each(peers, (p, i) => {
                DHT.Logger.info("Peer "+(i+1)+": "+p._node._router.length+" contacts");
            });
        });
}
else {
    peer = new Peer({contact:contact});
    peer.connect();
}


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
rl.setPrompt('PeerCLI > ');
rl.prompt();

rl.on('line', (line) => {
    let args = line.trim().split(" ");
    let op = args[0].toLowerCase();
    // console.log(args, op);
    switch(op) {
    case 'connect':
        {
            let contact;
            if (args[1]) {
                const addr = args[1].split(":")[0];
                const port = Number(args[1].split(":")[1]);
                contact = {address:addr,port:port};
            }

            console.log(contact);
            peer.connect(contact)
                .then(()=>rl.prompt());
        }
        break;
    case 'disconnect':
        {
            peer.disconnect();
            rl.prompt();
        }
        break;
    case 'get':
        {
            const filename = args[1];
            const password = args[2];
            peer.get(filename, password).then(()=>rl.prompt());
        }
        break;
    case 'put':
        {
            const filepath = args[1];
            const password = args[2];
            peer.put(filepath, password).then(()=>rl.prompt());
        }
        break;
    case '':
        rl.prompt();
        break;
    default:
        console.log("Invalid operation");
        rl.prompt();
        break;
    }
});
