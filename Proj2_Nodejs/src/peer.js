'use strict';

const Promise = require('bluebird');
const DHT = require('../libs/dht');
const _ = require('lodash');
const minimist = require('minimist');
const readline = require('readline');

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

    get(filename) {
        return this._node.get(filename)
            .then( ({ key, data }) =>
                   {
                       return File.deserialize(data);
                   })
            .then( buf =>
                   {
                       return File.saveFile(buf, './somos_aguca.png');
                   })
            .catch((err) => {DHT.Logger.error("Failed to get "+filename+". Reason: "+err.message);});
    }

    put(filepath) {
        return File.loadFile(filepath)
            .then(buf =>
                  {
                      return {key: filepath, data: File.serialize(buf)};
                  })
            .then(({ key, data }) =>
                  {
                      return this._node.put(key, data);
                  });
    }

}

const createPeers = (n) => {
    let peers = _.times(n, (i) => { return new Peer({contact: {port:10000+i}}); });
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

const argv = minimist(process.argv);
console.log(argv);

let peer;
if (argv.j) {
    const addr = argv.j.split(':')[0];
    const port = Number(argv.j.split(':')[1]);
    peer = new Peer({contact:{port:6000}});
    peer.connect({address: addr, port: port});
}
else if (argv.n) {
    const num = Number(argv.n);
    createPeers(num)
        .then(createNetwork)
        .then(peers => {
            _.each(peers, (p, i) => {
                DHT.Logger.info("Peer "+(i+1)+": "+p._node._router.length+" contacts");
            });
        });
}
else {
    peer = new Peer({contact:{port:6000}});
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
            peer.get(filename).then(()=>rl.prompt());
        }
        break;
    case 'put':
        {
            const filepath = args[1];
            peer.put(filepath).then(()=>rl.prompt());
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
