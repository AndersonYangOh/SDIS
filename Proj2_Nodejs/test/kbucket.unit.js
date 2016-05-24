/* jshint expr: true */
'use strict';

var expect = require('chai').expect;

describe('KBucket', function() {
    var KBucket = require('../src/kbucket.js');
    var Contact = require('../src/contact.js');

    var b1 = new KBucket();

    it('Should add new contacts', () => {
        b1.add(new Contact({address: '127.0.0.1', port: 6000}))
            .add(new Contact({address: '127.0.0.1', port: 6001}))
            .add(new Contact({address: '127.0.0.1', port: 6002}))
            .add(new Contact({address: '127.0.0.1', port: 6003}));

        expect(b1.length).to.equal(4);
    });

    it('Should move existing contacts to tail', () => {
        b1.add(new Contact({address: '127.0.0.1', port: 6002}));
        b1.add(new Contact({address: '127.0.0.1', port: 6000}));

        expect(b1.indexOf(new Contact({address: '127.0.0.1', port: 6000}))).to.equal(3);
        expect(b1.indexOf(new Contact({address: '127.0.0.1', port: 6002}))).to.equal(2);
    });

    it('Should remove existing contacts', () => {
        b1.remove(new Contact({address: '127.0.0.1', port: 6000}));

        expect(b1.length).to.equal(3);
    });

    it('Should sort by nearest', () => {
        let buck = new KBucket();
        for (let i = 0; i < 15; ++i) buck.add(new Contact({port:6000+i}));

        expect(buck.length).to.equal(15);

        let c1 = new Contact({address:'127.0.0.1',port:6000});
        let c2 = new Contact({address:'127.0.0.1',port:6010});

        expect(buck.head().equals(c1)).to.be.true;

        let sorted = buck.nearest(c2.nodeID);
        expect(sorted[0].contact.equals(c2)).to.be.true;
    });

});

