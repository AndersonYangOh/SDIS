'use strict';

var assert = require('assert');
var hat = require('hat');
var _ = require('lodash');

var constants = require('./constants.js');


var Message = (function (){
    var init = false;

    Message.Requests = Object.freeze({
        PING: {params: ['contact']},
        STORE: {params: ['contact']},
        FIND_NODE: {params: ['contact', 'key']},
        FIND_VALUE: {params: ['contact', 'key']}
    });

    function Message(spec) {
        if (!init) throw new Error('Please use Message.createMessage');
        init = false;

        this.jsonrpc = "2.0";
        for (var n in spec) {
            this[n] = spec[n];
        }
    }

    Message.prototype.isRequest = function() {
        return !!(this.method && this.params);
    };

    Message.prototype.isResponse = function() {
        return !!(this.id && (this.result || this.error));
    };

    function createRequest(req, params, id) {
        init = true;
        assert(Message.Requests.hasOwnProperty(req), 'Invalid request '+req);

        var spec = {params:{}};

        _.each(Message.Requests[req].params, (val) => {
            if (params.hasOwnProperty(val))
                spec.params[val] = params[val];
            else throw new Error('Invalid message format, missing: '+val);
        });

        spec.id = id || Message.createRandomID();
        spec.method = req;

        return new Message(spec);
    }

    function createResponse(id, result, err) {
        init = true;
        var spec = {};
        spec.id = id;
        if (err) console.error(new Error(err.code+': '+err.message));
        if (err) spec.error = err;
        else spec.result = result || {};

        return new Message(spec);
    }

    Message.createMessage = function() {
        var args = arguments;
        if (args.length === 0) throw new Error('No arguments provided');

        if (args[0] instanceof Message)
            return Message.fromRequest.apply(this, args);

        if (args.length === 1 && args[0] instanceof Buffer)
            return Message.fromBuffer.apply(this, args);

        if (args.length === 1 && typeof(args[0]) === 'object') {
            if (!!(args[0].method && args[0].params))
                return createRequest(args[0].method, args[0].params, args[0].id);
            else if (!!(args[0].id && (args[0].result || args[0].error)))
                return createResponse(args[0].id, args[0].result, args[0].error);
            else throw new Error('Invalid message specification');
        }

        if (args.length === 2 && typeof(args[0]) === 'string' &&
            typeof(args[1]) === 'object')
            return createRequest.apply(this, args);

        throw new Error('Invalid arguments');
    };

    Message.fromBuffer = function(buffer) {
        assert(buffer instanceof Buffer, 'Provided argument is not a buffer');
        var parse = JSON.parse(buffer.toString('utf8'));
        return Message.createMessage(parse);
    };

    Message.fromRequest = function(message, result, err) {
        assert(message instanceof Message, 'Provided argument is not a message');
        assert(message.isRequest(), 'Provided message is not a request');

        return createResponse(message.id, result, err);
    };

    Message.prototype.serialize = function() {
        return new Buffer(JSON.stringify(this), 'utf8');
    };

    Message.createRandomID = function(size) {
        size = size || constants.B;
        return hat.rack(size)();
    };

    return Message;
})();

module.exports = Message;
