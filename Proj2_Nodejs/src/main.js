'use strict';

const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');
const _ = require('lodash');

const Node = require('./node.js');
const RPC = require('./rpc.js');
const Contact = require('./contact.js');
const KBucket = require('./kbucket.js');
const Message = require('./message.js');
const FS = require('./storage/fs.js');
global.log = require('./logger.js');

var c1 = new Contact({address:'127.0.0.1',port:6000});
var c2 = new Contact({address:'127.0.0.1',port:6001});
var c3 = new Contact({address:'127.0.0.1',port:6002});

const createNodes = (n) => {
    let nodes = [];
    for (let i = 0; i < n; ++i)
        nodes.push(new Node({address:'127.0.0.1',port:6000+i}));
    return nodes;
};

const createNetwork = (nodes, master_idx) => {
    let master = nodes[master_idx];
    return master
        .connect()
        .then(()=>{
            return Promise.mapSeries(nodes, (node, i) => {
                i = i + 1;
                return node
                    .connect(master)
                    .then(()=>{
                        global.log.success("Node "+i+" connected");
                        global.log.info(node._router.length + " contacts known");
                    })
                    .catch((err)=>global.log.error("Node "+i+": ",err));
            });
        });
};

let nodes = createNodes(30);

// nodes[0].connect()
//     .then(() => {
//         return nodes[1].connect(nodes[0]);
//     })
//     .then (() => {
//         return nodes[0].ping(nodes[1]);
//     });

let network = createNetwork(nodes, 0);
network.then(()=>{
    global.log.warning("Network of "+nodes.length+" nodes is ready");
    _.each(nodes, (n, i) => {
        global.log.info("Node "+(i+1)+": "+n._router.length+" contacts");
    });
});
