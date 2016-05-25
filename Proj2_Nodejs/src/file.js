'use strict';

const Promise = require('bluebird');
const path = require('path');
const fs = Promise.promisifyAll(require('fs'));
const assert = require('assert');

class File {
    constructor(data, name) {
        this.data = data;
        this.name = name;
    }

    serialize() {
        return File.serialize(this.data);
    }

    static serialize(data) {
        assert(data instanceof Buffer);

        return data.toString('base64');
    }

    static deserialize(data) {
        assert(typeof data === 'string');

        return new Buffer(data, 'base64');
    }

    static loadFile(filepath) {
        let p = path.normalize(path.join(__dirname, filepath));
        return fs.readFileAsync(p);
    }

    static saveFile(data, filepath) {
        assert(data instanceof Buffer);

        let p = path.normalize(path.join(__dirname, filepath));
        fs.writeFileAsync(p, data);
    }
}

module.exports = File;
