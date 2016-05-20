'use strict';

var _ = require('lodash');
var assert = require('assert');
var Contact = require('./contact.js');

function KBucket() {
    this._contacts = [];
}

KBucket.prototype.add = function(contact) {
    assert(contact instanceof Contact, "Invalid contact "+contact);
    if (this.size() < 20) {
        if (!this.has(contact)) {
            this._contacts.push(contact);
        }
        else {
            var i = this.indexOf(contact);
            this._contacts.splice(i, 1);
            this._contacts.push(contact);
        }
    }
    return this;
};

KBucket.prototype.remove = function(contact) {
    var i = this.indexOf(contact);
    if (i !== -1) this._contacts.splice(i, 1);

    return this;
};

KBucket.prototype.indexOf = function (contact) {
    return _.findIndex(this._contacts,
                       function(o) { return o.nodeID == contact.nodeID; });
};

KBucket.prototype.has = function(contact) {
    if (this.indexOf(contact) !== -1) return true;
    return false;
};

KBucket.prototype.size = function() {
    return this._contacts.length;
};

KBucket.prototype.contacts = function() {
    return _.clone(this._contacts);
};

module.exports = KBucket;
