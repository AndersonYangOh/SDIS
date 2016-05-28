'use strict';

const minimist = require('minimist');
const readline = require('readline');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const Peer = require('./peer.js');

function peerCLI (peer) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: completer
    });

    rl.setPrompt(chalk.bold.bgBlue.black(" PeerCLI ")+" ");
    rl.prompt();

    rl.on('line', line => {
        const args = minimist(line.split(' '));
        let op = args['_'][0].toLowerCase();
        if (op === 'connect') {
            let contact;
            if (args['_'][1]) {
                const addr = args['_'][1].split(":")[0];
                const port = Number(args['_'][1].split(":")[1]);
                contact = {address:addr,port:port};
            }
            peer.connect(contact)
                .then(()=>rl.prompt());
        }
        else if  (op === 'disconnect') {
            peer.disconnect();
            rl.prompt();
        }
        else if  (op === 'get') {
            const filename = args['_'][1];
            const savename = args['_'][2];
            const password = args.p || args.password;
            peer.get(filename, password).then(()=>rl.prompt());
        }
        else if  (op === 'put') {
            const filepath = args['_'][1];
            const savename = args['_'][2];
            const password = args.p || args.password;
            peer.put(filepath, password).then(()=>rl.prompt());
        }
        else if  (op === 'info') {
            const info = peer.info();
            console.log(info);
            rl.prompt();
        }
        else if  (op === 'exit' || op === 'quit') {
            peer.disconnect();
            process.exit();
        }
        else if  (op === '') {
            rl.prompt();
        }
        else {
            console.log("Invalid operation");
            rl.prompt();
        }
    });
}

function completer(linePartial, callback) {
    const ops = 'connect |disconnect |get |put |info |exit |quit'.split('|');
    const args = linePartial.split(' ');
    const op = _.first(args);

    let completions = ops;

    if(op === 'put') {
        return callback(null, fileCompleter(linePartial));
    }

    let hits = completions.filter(c => { return c.indexOf(linePartial) === 0; });

    return callback(null, [hits.length ? hits : completions, linePartial]);
}

function fileCompleter(line) {
    const before = _.initial(line.split(' ')).join(' ');
    const path_str = _.last(line.split(' '));
    const currPath = path.parse(path_str+'./');


    const ls = fs.readdirSync(currPath.dir || './');

    const full_completions = _.map(ls, n => {
        return before+' '+path.join(currPath.dir, n + (fs.lstatSync(path.join(currPath.dir, n)).isDirectory() ? '/' : ''));
    });

    let hits = full_completions.filter(c => { return c.indexOf(line) === 0; });

    let what_to_show;
    if (hits.length === 0) what_to_show = ls;
    else if (hits.length === 1) what_to_show = hits;
    else what_to_show = _.map(hits, h => path.basename(h));

    return [what_to_show, line];
}

module.exports = function () {
    return peerCLI;
};

