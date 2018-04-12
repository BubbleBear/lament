const http = require('http');
const net = require('net');
const url = require('url');
const string2readable = require('../utils/string2readable');
const tunnelCurl = require('../net/tunnel_curl');
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
            setTimeout(() => {
                cSock.destroy(e);
            }, 5000);
            console.log(`tunnel_proxy sSock error\n`, path, e);
        }).on('end', () => {
            cSock.end();
        }).setTimeout(5000, () => {
            cSock.destroy('timeout');
            console.log(`tunnel_proxy timeout\n`, path);
        });

        cSock.on('error', (e) => {
            sSock.connecting && sSock.destroy(e);
            console.log(`tunnel_proxy cSock error\n`, path, e);
        }).on('end', () => {
            sSock.connecting && sSock.end();
        })
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
