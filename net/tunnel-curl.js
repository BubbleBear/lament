const http = require('http');
const zlib = require('zlib');
const url = require('url');
const string2readable = require('../utils/string2readable');

const REQUIRED = (require.main !== module);

function curl(opts, sendHeaders) {
    return new Promise((resolve, reject) => {
        const req = http.request(opts).on('connect', (res, sock, head) => {
            req.removeAllListeners('timeout');
            sock.on('error', err => {
                console.log(`sock in tunnel-curl error:\n${err}`);
            });
            resolve(sock);
            let chunks = [];

            if (!REQUIRED || sendHeaders) {
                let headers = assembleHeaders(opts);
                if (opts.inner && opts.inner.Cipher) {
                    string2readable(headers).pipe(new opts.inner.Cipher()).pipe(sock);
                } else {
                    string2readable(headers).pipe(sock);
                }
            }

            if (!REQUIRED) {
                sock.on('data', chunk => {
                    chunks.push(chunk);
                }).once('end', () => {onend(chunks, req, res, sock)});
            }
        }).on('error', err => {
            console.log('tunnel-curl error\n', err);
            reject('error');
        }).setTimeout(5000, () => {
            console.log('tunnel-curl timeout\n');
            req.abort();
            reject('timeout');
        });

        req.flushHeaders();
    })
}

function assembleHeaders(opts) {
    const uri = url.parse('http://' + (opts.inner && opts.inner.path || opts.path));
    const method = opts.inner && opts.inner.method && opts.inner.method.toUpperCase() || 'GET';
    const httpVersion = opts.inner && opts.inner.httpVersion || 1.1;

    // connection has to be close for now, which is to be optimized
    let headers = `${method} ${uri.path} HTTP/${httpVersion}\r\n` + 
                `connection: close\r\n`;
    opts.inner && opts.inner.headers.host || (headers += `host: ${uri.host}\r\n`);

    if (opts.inner && opts.inner.headers) {
        for (const k in opts.inner.headers) {
            if (k.includes('connection')) continue;
            headers += `${k}: ${opts.inner.headers[k]}\r\n`
        }
    }
    headers += '\r\n';
    return headers;
}

// more like a test case
function onend(chunks, req, res, sock) {
    let buffer = Buffer.concat(chunks);
    let response = buffer.toString().split('\r\n\r\n');
    let headers = response[0].split('\r\n');
    let status = headers[0].split(' ');
    let location;

    for (let header of headers) {
        if (header.indexOf('Location:') === 0) {
            location = header.slice('Location:'.length).trim();
        }
    }

    if (location) {
        req.abort();
        res.destroy();
        sock.end();
        curl({
            hostname: 'localhost',
            port: 5555,
            method: 'connect',
            path: location.replace(/https?:\/\//, '')
        });
    }

    if (status[1] == 200) {
        console.log(response[1]);
    }
}

if (!REQUIRED) {
    curl({
        hostname: 'localhost',
        port: 5555,
        method: 'connect',
        path: 'nodejs.org/dist/latest-v8.x/docs/api/tls.html'
    });
}

module.exports = curl;
