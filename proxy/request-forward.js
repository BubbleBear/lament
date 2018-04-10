const http = require('http');
const url = require('url');
const string2readable = require('../utils/string2readable');
const DummyCipher = require('../cipher/dummy');
const tunnelCurl = require('../net/tunnel-curl');

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function legacyProxy(cReq, cRes) {
        const remoteOptions = assembleOptions(cReq);
        const localOptions = Object.assign({}, remoteOptions);
        localOptions.hostname = 'localhost';
        
        Promise.race([tunnelCurl(remoteOptions, 1), tunnelCurl(localOptions, 1)]).then((socket) => {
            cReq.pipe(new Cipher(), {end: false}).pipe(socket);
            socket.pipe(new Decipher).pipe(cRes.socket);
        }, (err) => {
            cRes.writeHead(400, err.message || err);
            cRes.end();
        }).catch(err => {
            console.log(err);
        });
    };

    function assembleOptions(cReq) {
        const options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.headers = cReq.headers;
        path = `${options.hostname}:${options.port || 80}${options.path}`;
        cPath = encodeURI(Cipher.reverse(Buffer.from(path)).toString());

        return {
            hostname: global.config.servers[global.config.onuse].host,
            port: global.config.servers[global.config.onuse].port,
            method: 'connect',
            path: cPath,
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
                path: path,
                headers: options.headers,
                Cipher: Cipher
            }
        };
    }
}

module.exports = proxyWrapper;
