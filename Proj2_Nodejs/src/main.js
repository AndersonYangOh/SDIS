'use strict';

const path = require('path');

const Node = require('./node.js');
const RPC = require('./rpc.js');
const Contact = require('./contact.js');
const Bucket = require('./kbucket.js');
const Message = require('./message.js');
const FS = require('./storage/fs.js');

var n1 = new Node(Contact({address:'127.0.0.1',port:6000}));
var n2 = new Node(Contact({address:'127.0.0.1',port:6001}));

n1.ping(n2).then((RTT)=>{console.log("Reply from "+n2.contact+": time="+RTT+"ms");});

n1.router.lookup('NODE', n2.id).catch(e=>{console.error(e);});
