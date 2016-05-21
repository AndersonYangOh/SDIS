'use strict';

var fs = require('fs');
var path = require('path');

function FileSystem(root) {
    this.root = root;
}

FileSystem.prototype.read = function(file, cb) {
    let dir = path.join(this.root, file);
    var data = fs.readFile(dir, cb);
};

FileSystem.prototype.write = function(file, data, cb) {
    let dir = path.join(this.root, file);
    fs.writeFile(dir, data, cb);
};

module.exports = FileSystem;
