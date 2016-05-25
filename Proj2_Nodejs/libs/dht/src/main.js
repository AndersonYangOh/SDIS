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
    } else {
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

const printNetworkInfo = (nodes) => {
    global.log.success("Network of "+nodes.length+" nodes complete");
    _.each(nodes, (n, i) => {
        // for (let [ prefix, buck ] of n._router.buckets.entries()) {
        // console.log("+ Bucket " + prefix);
        // _.each(buck.contacts(),
        //        c => console.log("  |---- "+c+" | "+Key.prefix(n.contact.nodeID, c.nodeID)+" | "+Key.distance(n.contact.nodeID, c.nodeID).readUInt8()));
        // }
        global.log.info("Node "+(i+1)+": "+n._router.length+" contacts out of "+n._router.buckets.size+" buckets");});

    return nodes;
};

let n;
createNodes(10)
    .then(createNetwork)
    .then(printNetworkInfo)
    .then(nodes =>
          {
              n = nodes;
              return n[0].put("KEY1", "CONTENT1");
          })
    .then(({ value, replDeg }) =>
          {
              global.log.success("Successfully stored "+replDeg+" copies of: ", value);
          })
    .then( () =>
           {
               return n[5].get("KEY1");
           })
    .then (value =>
           {
               global.log.success("Successfully retreived: ", value);
           });
