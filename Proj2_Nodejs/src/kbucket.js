'use strict';

const _ = require('lodash');
const assert = require('assert');
const Promise = require('bluebird');

const Contact = require('./contact.js');
const constants = require('./constants.js');
const Key = require('./key.js');

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
        if (!c) c = tmp[0];
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
            global.log.success("Contact at head is alive, moving to tail...");
            moveToTail(0);
        }).catch(Promise.TimeoutError, (err) => {
            global.log.error("Contact at head didn't respond, removing...");
            moveToTail(0, contact);
        });
    }

    return this;
};

KBucket.prototype.head = function() {
    return _.head(this._contacts);
};

KBucket.prototype.tail = function() {
    return _.tail(this._contacts);
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
    return _.findIndex(this._contacts, (c) => { return c.equals(contact); });
};

KBucket.prototype.has = function(contact) {
    return this.indexOf(contact) !== -1;
};

KBucket.prototype.nearest = function(key) {
    return _.chain(this._contacts)
        .clone()
        .map(c => { return {contact: c, distance: key.distance(c.nodeID)}; })
        .sort((c1, c2) => Key.compare(c1.distance, c2.distance))
        .value();
};

KBucket.prototype.contacts = function() {
    return _.clone(this._contacts);
};

module.exports = KBucket;
