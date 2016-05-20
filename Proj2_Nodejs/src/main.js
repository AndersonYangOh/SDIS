'use strict';

var _ = require('lodash');
var KBucket = require('./kbucket.js');
var Contact = require('./contact.js');

var b1 = new KBucket();
b1.add(new Contact({address: '127.0.0.1', port: 6000}))
    .add(new Contact({address: '127.0.0.1', port: 6001}))
    .add(new Contact({address: '127.0.0.1', port: 6002}))
    .add(new Contact({address: '127.0.0.1', port: 6003}));

_.each(b1.contacts(), (c)=>{console.log(c+"");});
console.log("-----------------");

b1.add(new Contact({address: '127.0.0.1', port: 6002}));
b1.add(new Contact({address: '127.0.0.1', port: 6000}));

_.each(b1.contacts(), (c)=>{console.log(c+"");});
console.log("-----------------");

b1.remove(new Contact({address: '127.0.0.1', port: 6000}));

_.each(b1.contacts(), (c)=>{console.log(c+"");});
console.log("-----------------");
