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

class Logger {
    static log() {
        console.log.apply(console, arguments);
    }
    static info(msg) {
        var before = [chalk.bgBlack.white.bold("  INFO   ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static success(msg) {
        var before = [chalk.bgGreen.white.bold(" SUCCESS ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static warning(msg) {
        var before = [chalk.bgYellow.black.bold(" WARNING ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static error(msg) {
        var before = [chalk.bgRed.yellow.bold("  ERROR  ")+chalk.styles.bgRed.open+chalk.styles.white.open+chalk.styles.bold.open];
        var after = [chalk.styles.bgRed.close+chalk.styles.white.close+chalk.styles.bold.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static test() {
        Logger.info("Test");
        Logger.success("Test");
        Logger.warning("Test");
        Logger.error("Test");
    }
}

global.log = Logger;

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
