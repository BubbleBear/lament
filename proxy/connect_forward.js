const http = require('http');
const net = require('net');
const url = require('url');
const string2readable = require('../utils/string2readable');
const tunnelCurl = require('../net/tunnel_curl');
const DummyCipher = require('../cipher/dummy');

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function tunnelProxy(cReq, cSock, head) {
        const remoteOptions = assembleOptions(cReq);
        const localOptions = Object.assign({}, remoteOptions);
        localOptions.hostname = global.config.servers[0].host;
        localOptions.port = global.config.servers[0].port;

        Promise.race([tunnelCurl(remoteOptions), tunnelCurl(localOptions)]).then((socket) => {
            string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
            string2readable(head).pipe(socket);
            cSock.pipe(new Cipher()).pipe(socket);
            socket.pipe(new Decipher()).pipe(cSock);
        }, (err) => {
            cSock.end();
        }).catch(err => {
            console.log(err);
        });
    }

    function assembleOptions(cReq) {
        const options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.port || (options.port = 80);

        path = cReq.url;
        cPath = encodeURI(Cipher.reverse(Buffer.from(path)).toString());

        return {
            hostname: global.config.servers[global.config.onuse].host,
            port: global.config.servers[global.config.onuse].port,
            method: 'connect',
            path: cPath
        };
    }
}

module.exports = proxyWrapper;
