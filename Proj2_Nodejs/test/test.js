'use strict';

var expect = require('chai').expect;

describe('Contact', function() {
    var Contact = require('../src/contact.js');

    it('should throw with invalid options', function () {
        expect(Contact).to.throw(/invalid options/i);
    });

    it('should throw with invalid address', function () {
        expect(function(){new Contact({address: 1});})
            .to.throw(/invalid address/i);
    });

    it('should throw with invalid port', function () {
        expect(function(){new Contact({address: 'localhost', port: 8080});})
            .to.not.throw(/invalid port/i);
        expect(function(){new Contact({address: 'localhost', port: 0});})
            .to.throw(/invalid port/i);
        expect(function(){new Contact({address: 'localhost', port: 80000});})
            .to.throw(/invalid port/i);
    });
});
