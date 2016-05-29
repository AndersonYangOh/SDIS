'use strict';

const Promise = require('bluebird');
const DHT = require('../libs/dht');
const hat = require('hat');
const crypto = require('crypto');
const path = require('path');

const File = require('./file.js');


class Peer {
    constructor({ contact } = {}) {
        this._node = new DHT.Node(new DHT.Contact(contact));
    }

    connect(arg1) {
        let contact = arg1;
        if (arg1 instanceof Peer) contact = arg1._node.contact;

        return this._node.connect(contact).then().return(this);
    }

    disconnect() {
        this._node.disconnect();
    }

    get(filename, password) {
        const getMetaData = (filename) => {
            return this._node.get(filename);
        };
        const handleMetaData = ({ key, data }) => {
            const metadata = JSON.parse(data);
            if (metadata.encrypted && !password) throw new Error("No password provided for encrypted file");
            return metadata;
        };
        const getFile = (metadata) => {
            return this._node.get(metadata.filekey)
                .then( ({ key, data }) => {
                    return {metadata: metadata, received: {key:key, data:data}};
                });
        };
        const checkIntegrity = ({ metadata, received }) => {
            if (metadata.filekey !== received.key) throw new Error("Keys don't match");

            const data = File.deserialize(received.data);
            const checksum = crypto.createHash('md5').update(data).digest('hex');

            if (checksum !== metadata.checksum) throw new Error("CHECKSUM doesn't match");

            return {metadata: metadata, data: data};
        };
        const decryptContents = ({ metadata, data }) => {
            if (password && metadata.encrypted) {
                global.log.info('Password detected. Decrypting contents...');
                let decipher = crypto.createDecipher('aes-256-ctr', password);
                let decrypted = decipher.update(data);
                decrypted = Buffer.concat([decrypted, decipher.final()]);
                return {metadata:metadata, file:decrypted};
            }
            return {metadata: metadata, file:data};
        };
        const saveFile = ({ metadata, file }) => {
            const saveName = metadata.name+".bk"+metadata.extension;
            return File.saveFile(file, saveName);
        };

        return getMetaData(filename)
            .then(handleMetaData)
            .then(getFile)
            .then(checkIntegrity)
            .then(decryptContents)
            .then(saveFile)
            .catch((err) => {DHT.Logger.error("Failed to get "+filename+". Reason: ",err);});
    }

    put(filepath, password) {
        const encryptContents = ({ info, data }) => {
            if (password) {
                global.log.info('Password detected. Encrypting contents...');
                let cipher = crypto.createCipher('aes-256-ctr', password);
                let crypted = cipher.update(data);
                crypted = Buffer.concat([crypted, cipher.final()]);
                return {info:info, data:crypted};
            }
            return {info:info, data:data};
        };
        const createMetaData = ({ info, data }) => {
            const randKey = hat.rack(160)()+info.path.base+info.stat.ctime.getTime();
            const metadata = {
                name: info.path.name,
                base: info.path.base,
                extension: info.path.ext,
                encrypted: !!(password),
                filekey: crypto.createHash('sha1').update(randKey).digest('hex'),
                checksum: crypto.createHash('md5').update(data).digest('hex')
            };
            return this._node.put(metadata.base, JSON.stringify(metadata))
                .return({key: metadata.filekey, data: data});
        };
        const backupFile = ({ key, data }) => {
            const serialized = File.serialize(data);
            return this._node.put(key, serialized);
        };

        return File.loadFile(filepath)
            .then(encryptContents)
            .then(createMetaData)
            .then(backupFile)
            .catch(err => {
                global.log.error(err);
            });
    }

    info({} = {}) {
        let info = {};
        info.contact = this._node.contact;
        info.network = this._node._router.length;
        info.storage = this._node._storage.size;

        return info;
    }
}

module.exports = Peer;
module.exports.DHT = DHT;
