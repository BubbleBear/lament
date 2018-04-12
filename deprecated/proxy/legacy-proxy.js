const http = require('http');
const url = require('url');
const DummyCipher = require('../cipher/dummy');
const tunnelCurl = require('../net/tunnel_curl');

const REQUIRED = (require.main !== module);

function proxyWrapper({Cipher, Decipher} = {Cipher: DummyCipher, Decipher: DummyCipher}) {
    return function legacyProxy(cReq, cRes) {
        let options = url.parse(cReq.url.indexOf('http') ? 'http://' + cReq.url: cReq.url);
        options.headers = cReq.headers;

        let sReq = http.request(options, (sRes) => {
            cRes.writeHead(sRes.statusCode, sRes.headers);
            sRes.pipe(new Decipher()).pipe(cRes);
        }).on('error', (e) => {
            console.log(`legacy-proxy\n`, e);
        });

        cReq.pipe(new Cipher()).pipe(sReq);
    };
}

if (!REQUIRED) {
    const PROXY_PORT = 5555;

    const server = http.createServer()
        .on('request', proxyWrapper())
        .listen(PROXY_PORT);

    server.on('error', (e) => {
        console.dir(e);
    })
}

module.exports = proxyWrapper;
