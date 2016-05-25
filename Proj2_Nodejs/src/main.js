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
const Key = require('./key.js');
global.log = require('./logger.js');

const createNodes = (n) => {
    let nodes = _.times(n, (i) => { return new Node({port:65535-i}); });
    return Promise.map(nodes, node => node.connect());
};

const createNetwork = (nodes, master_idx = false) => {
    if (master_idx === false) {
        return Promise.map(nodes, (node, i) => {
            return nodes[i].connect(nodes[i+1]).then((node)=>{
                global.log.success("Node "+(i+1)+" connected");
                return node;
            });
        });
    }
    else {
        let master = nodes[master_idx];
        return Promise.map(nodes, (node, i) => {
            return nodes[i].connect(master)
                .then((node) => {
                    global.log.success("Node "+(i+1)+" connected");
                    return node;
                });
        });
    }
};

createNodes(30).then((nodes) => {
    return createNetwork(nodes);
}).then((nodes) => {
    global.log.success("Network of "+nodes.length+" nodes complete");
    _.each(nodes, (n, i) => {
        for (let [ prefix, buck ] of n._router.buckets.entries()) {
            // console.log("+ Bucket " + prefix);
            // _.each(buck.contacts(),
            //        c => console.log("  |---- "+c+" | "+Key.prefix(n.contact.nodeID, c.nodeID)+" | "+Key.distance(n.contact.nodeID, c.nodeID).readUInt8()));
        }
        global.log.info("Node "+(i+1)+": "+n._router.length+" contacts out of "+n._router.buckets.size+" buckets");});
});

// nodes[0].connect(nodes[1]);

// nodes[0].connect()
//     .then(() => {
//         return nodes[1].connect(nodes[0]);
//     })
//     .then (() => {
//         console.log(nodes[0]._router.length);
//         console.log(nodes[1]._router.length);
//         return nodes[0].ping(nodes[1]);
//     }).then( (RTT) => {
//         global.log.success(RTT+"ms");
//     });

// let network = createNetwork(nodes, 0);
// network.then(()=>{
//     global.log.warning("Network of "+nodes.length+" nodes is ready");
//     _.each(nodes, (n, i) => {
//         global.log.info("Node "+(i+1)+": "+n._router.length+" contacts");
//     });
// });
