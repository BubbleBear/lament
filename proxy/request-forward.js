const http = require('http');
const url = require('url');
const DummyCipher = require('../cipher/dummy');
const tunnelCurl = require('../net/tunnel-curl');

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function legacyProxy(cReq, cRes) {
        let options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.headers = cReq.headers;

        const connectOptions = {
            hostname: config.servers[0].hostname,
            port: config.servers[0].port,
            method: 'connect',
            path: `${options.hostname}:${options.port || 80}${options.path}`,
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
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
