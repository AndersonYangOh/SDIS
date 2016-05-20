'use strict';

var RPC = require('./rpc.js');
var Contact = require('./contact.js');

var p1 = new RPC(new Contact({address: '127.0.0.1', port: 6001}));
var p2 = new RPC(new Contact({address: '127.0.0.1', port: 6002}));

p1.open(()=>{console.log("P1 open");});
p2.open(()=>{console.log("P2 open");});

p1.send("Message from p1", new Contact({address: '127.0.0.1', port: 6002}));
p2.send("Message from p2", new Contact({address: '127.0.0.1', port: 6001}));
