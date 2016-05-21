'use strict';

var expect = require('chai').expect;

describe('KBucket', function() {
    var KBucket = require('../src/kbucket.js');
    var Contact = require('../src/contact.js');

    var b1 = new KBucket();

    it('Should add new contacts', function() {
        b1.add(new Contact({address: '127.0.0.1', port: 6000}))
            .add(new Contact({address: '127.0.0.1', port: 6001}))
            .add(new Contact({address: '127.0.0.1', port: 6002}))
            .add(new Contact({address: '127.0.0.1', port: 6003}));

        expect(b1.length).to.equal(4);
    });

    it('Should move existing contacts to tail', function() {
        b1.add(new Contact({address: '127.0.0.1', port: 6002}));
        b1.add(new Contact({address: '127.0.0.1', port: 6000}));

        expect(b1.indexOf(new Contact({address: '127.0.0.1', port: 6000}))).to.equal(3);
        expect(b1.indexOf(new Contact({address: '127.0.0.1', port: 6002}))).to.equal(2);
    });

    it('Should remove existing contacts', function() {
        b1.remove(new Contact({address: '127.0.0.1', port: 6000}));

        expect(b1.length).to.equal(3);
    });

});

