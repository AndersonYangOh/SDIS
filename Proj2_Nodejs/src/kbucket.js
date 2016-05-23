'use strict';

const _ = require('lodash');
const assert = require('assert');
const Promise = require('bluebird');

const Contact = require('./contact.js');
const constants = require('./constants.js');

function KBucket() {
    this._contacts = [];
    Object.defineProperty(this, 'length', {get: function(){return this._contacts.length;}});
}

KBucket.prototype.add = function(contact, ping) {
    assert(contact instanceof Contact, "Invalid contact "+contact);

    var idx = this.indexOf(contact);
    var exists = idx !== -1;
    var head = this._contacts[0];

    var moveToTail = (i, c) => {
        let tmp = this._contacts.splice(i, 1);
        if (!c) c = tmp;
        this._contacts.push(c);
    };

    if (exists) {
        moveToTail(idx);
    }
    else if (!exists && this.length < constants.K) {
        this._contacts.push(contact);
    }
    else if (!exists && this.length === constants.K &&
             typeof(ping) === 'function' && ping){
        ping(head).then((RTT) => {
            moveToTail(0);
        }).catch((e) => {
            moveToTail(0, contact);
        });
    }

    return this;
};

KBucket.prototype.getN = function(n) {
    return _.slice(this._contacts, 0, n);
};

KBucket.prototype.remove = function(contact) {
    var i = this.indexOf(contact);
    if (i !== -1) this._contacts.splice(i, 1);

    return this;
};

KBucket.prototype.indexOf = function (contact) {
    return _.findIndex(this._contacts, (o) => {
        return o.nodeID.key === contact.nodeID.key;
    });
};

KBucket.prototype.has = function(contact) {
    return this.indexOf(contact) !== -1;
};

KBucket.prototype.contacts = function() {
    return _.clone(this._contacts);
};

module.exports = KBucket;
