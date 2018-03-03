const http = require('http');
const net = require('net');
const url = require('url');
const string2readable = require('../utils/string2readable');
const tunnelCurl = require('../net/tunnel-curl');
const DummyCipher = require('../cipher/dummy');

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function tunnelProxy(cReq, cSock, head) {
        let options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.port || (options.port = 80);

        path = cReq.url;
        cPath = encodeURI(Cipher.reverse(Buffer.from(path)).toString());

        const connectOption = {
            hostname: global.config.servers[global.config.onuse].hostname,
            port: global.config.servers[global.config.onuse].port,
            method: 'connect',
            path: cPath
        };
        tunnelCurl(connectOption).then((socket) => {
            string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
            string2readable(head).pipe(socket);
            cSock.pipe(new Cipher()).pipe(socket);
            socket.pipe(new Decipher()).pipe(cSock);
        }, (err) => {
            cSock.end();
        })
    }
}

module.exports = proxyWrapper;
