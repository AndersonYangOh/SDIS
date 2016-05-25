'use strict';

const Promise = require('bluebird');
const DHT = require('my-kademlia');
const _ = require('lodash');

const File = require('./file.js');

class Peer {
    constructor({ contact } = {}) {
        this._node = new DHT.Node(new DHT.Contact(contact));
    }

    connect(arg1) {
        let contact;
        if (arg1 instanceof Peer) contact = arg1._node.contact;

        return this._node.connect(contact).return(this);
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
                   });
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
    let peers = _.times(n, (i) => { return new Peer({contact: {port:65535-i}}); });
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

// let p1 = new Peer({contact:{port:6000}});
createPeers(10)
    .then(createNetwork)
    .then(peers => {
        const p1 = peers[0];

        return p1.put('./Boost_full.jpg')
            .delay(1000)
            .then( () => {
                return p1.get('./Boost_full.jpg');
            })
            .then(()=>DHT.Logger.success("Successfully retreived file"));
    });


// File.loadFile('./Boost_full.jpg')
//     .then(File.serialize)
//     .then(File.deserialize)
//     .then(des =>
//           {
//               File.saveFile(des, './Boost_full.bk.jpg');
//           });
