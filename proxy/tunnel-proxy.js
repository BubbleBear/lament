const http = require('http');
const net = require('net');
const url = require('url');
const string2readable = require('../utils/string2readable');
const tunnelCurl = require('../net/tunnel-curl');
const DummyCipher = require('../cipher/dummy');

const REQUIRED = (require.main !== module);

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function tunnelProxy(cReq, cSock, head) {
        let options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.port || (options.port = 80);

        // for client side proxy
        if (REQUIRED) {
            const connectOption = {
                hostname: 'localhost',
                port: 5555,
                method: 'connect',
                path: cReq.url
            };
            tunnelCurl(connectOption).then((socket) => {
                string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
                string2readable(head).pipe(socket);
                cSock.pipe(new Cipher()).pipe(socket);
                socket.pipe(new Decipher()).pipe(cSock);
            }, (err) => {
                console.log(err)
            })
            return;
        }

        // for server side proxy
        let sSock = net.connect({port: options.port, host: options.hostname}, () => {
            string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
            string2readable(head).pipe(sSock);
            sSock.pipe(new Cipher()).pipe(cSock);
            cSock.pipe(new Decipher()).pipe(sSock);
        }).on('error', (e) => {
            console.log(`tunnel-proxy\n`, cReq.url, e);
        });
    }
}

if (!REQUIRED) {
    const PROXY_PORT = 5555;

    const server = http.createServer()
        .on('connect', proxyWrapper())
        .listen(PROXY_PORT);

    server.on('error', (e) => {
        console.dir(e);
    });
}

module.exports = proxyWrapper;
