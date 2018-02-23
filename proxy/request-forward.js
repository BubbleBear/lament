const http = require('http');
const url = require('url');
const string2readable = require('../utils/string2readable');
const DummyCipher = require('../cipher/dummy');
const tunnelCurl = require('../net/tunnel-curl');

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function legacyProxy(cReq, cRes) {
        let options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.headers = cReq.headers;

        path = `${options.hostname}:${options.port || 80}${options.path}`;
        cPath = encodeURI(Buffer.from(path).map((v) => {return 128 - v}).toString());

        const connectOptions = {
            hostname: config.servers[config.server].hostname,
            port: config.servers[config.server].port,
            method: 'connect',
            path: cPath,
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
                path: path,
                headers: options.headers,
                Cipher: Cipher
            }
        }
        tunnelCurl(connectOptions).then((socket) => {
            cReq.pipe(new Cipher(), {end: false}).pipe(socket);
            socket.pipe(new Decipher).pipe(cRes.socket);
        })
    };
}

module.exports = proxyWrapper;
