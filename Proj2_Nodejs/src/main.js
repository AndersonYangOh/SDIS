'use strict';

const minimist = require('minimist');
const _ = require('lodash');
const Promise = require('bluebird');

const Peer = require('./peer.js');
const DHT = require('./peer.js').DHT;
const CLI = require('./cli.js')();

global.log = DHT.Logger;

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

function main(args) {
    const argv = minimist(args.slice(2));

    let contact_regex = /(?:(\d{1,3}(?:\.\d{1,3}){3}):)?(\d+)/;
    if (!contact_regex.test(argv._[0])) throw new TypeError("Invalid contact provided");

    const tmp = contact_regex.exec(argv._[0]);

    let contact = {
        address: tmp[1] || '127.0.0.1',
        port: Number(tmp[2])
    };

    if (argv.j) {
        const addr = argv.j.split(':')[0];
        const port = Number(argv.j.split(':')[1]);

        let peer;
        peer = new Peer({contact: contact});
        peer.connect({address: addr, port: port}).then( () => {
            CLI(peer);
        });
    }
    else if (argv.n) {
        const num = Number(argv.n);
        createPeers(contact, num)
            .then(createNetwork)
            .then(peers => {
                _.each(peers, (p, i) => {
                    DHT.Logger.info("Peer "+(i+1)+": "+p._node._router.length+" contacts");
                });
                let peer = peers[0];
                CLI(peer);
            });
    }
    else {
        let peer = new Peer({contact:contact});
        peer.connect().then( () => {
            CLI(peer);
        });
    }
}

main(process.argv);
