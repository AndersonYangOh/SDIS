/* jshint expr: true */
'use strict';

const expect = require('chai').expect;

describe('Key', () => {
    const Key = require('../src/key.js');
    const Contact = require('../src/contact.js');
    const kad = require('kad');
    const _ = require('lodash');

    it('Should calculate distance between keys correctly', () => {
        const contacts = _.times(50, i => { return new Contact({port:65535-i}); });

        for (let i = 0; i < contacts.length-1; ++i) {
            const c1 = contacts[i];
            const c2 = contacts[i+1];

            const kad_dist = kad.utils.getDistance(c1.nodeID.key, c2.nodeID.key);
            const my_dist = Key.distance(c1.nodeID, c2.nodeID);

            expect(Buffer.isBuffer(my_dist)).to.be.true;
            expect(Buffer.isBuffer(kad_dist)).to.be.true;

            expect(kad_dist.equals(my_dist)).to.be.true;
            expect(kad_dist.readUInt8()).to.equal(my_dist.readUInt8());
        }

    });

    it('Should calculate prefix between keys corretly', () => {

        const contacts = _.times(50, i => { return new Contact({port:65535-i}); });

        for (let i = 0; i < contacts.length-1; ++i) {
            const c1 = contacts[i];
            const c2 = contacts[i+1];

            const my_dist = Key.distance(c1.nodeID, c2.nodeID);

            const kad_prefix = kad.utils.getBucketIndex(c1.nodeID.key, c2.nodeID.key);
            const my_prefix = Key.prefix(c1.nodeID, c2.nodeID);

            expect(my_prefix).to.equal(kad_prefix);
        }
    });
});
