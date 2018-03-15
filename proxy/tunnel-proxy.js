const http = require('http');
const net = require('net');
const url = require('url');
const string2readable = require('../utils/string2readable');
const tunnelCurl = require('../net/tunnel-curl');
const DummyCipher = require('../cipher/dummy');

const REQUIRED = (require.main !== module);

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function tunnelProxy(cReq, cSock, head) {
        cPath = cReq.url;
        path = Decipher.reverse(Buffer.from(decodeURI(cPath))).toString();
        const options = url.parse(path.indexOf('http') ? 'http://' + path: path);
        options.port || (options.port = 80);

        const sSock = net.connect({port: options.port, host: options.hostname}, () => {
            sSock.removeAllListeners('timeout');
            string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
            string2readable(head).pipe(sSock);
            cSock.pipe(new Decipher()).pipe(sSock);
            sSock.pipe(new Cipher()).pipe(cSock);
        }).on('error', (e) => {
            console.log(`tunnel-proxy error\n`, path, e);
        }).on('end', () => {
            sSock.end();
        }).setTimeout(5000, () => {
            sSock.end();
            cSock.end();
            console.log(`tunnel-proxy timeout\n`, path);
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
