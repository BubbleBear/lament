import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';
import { Transform } from 'stream';
import string2readable = require('./string2readable');
import { DummyCipher, DummyDecipher } from './dummy';

export default class ProxyFactory {
    private config;

    private Cipher: typeof DummyCipher;

    private Decipher: typeof DummyDecipher;

    constructor(config, options?) {
        options || (options = {});
        this.config = config;
        this.Cipher = options.Cipher || DummyCipher;
        this.Decipher = options.Decipher || DummyDecipher;
    }

    public getLegacyProxy() {
        return async (cReq: http.IncomingMessage, cRes: http.ServerResponse) => {
            const remoteOptions = this.assembleOptions(cReq);
            const localOptions = this.assembleOptions(cReq, true);

            const connectList = [];
            remoteOptions && connectList.push(remoteOptions);
            localOptions && connectList.push(localOptions);

            Promise.race(connectList.map(v => this.connect(v, 1))).then((socket: net.Socket) => {
                cReq.pipe(new this.Cipher, {end: false}).pipe(socket);
                socket.pipe(new this.Decipher).pipe(cRes.connection);
            }, (err) => {
                cRes.writeHead(400, err.message || 'unknown error');
                cRes.end();
            }).catch(err => {});
        };
    }

    public getTunnelProxy() {
        return async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
            const remoteOptions = this.assembleOptions(cReq);
            const localOptions = this.assembleOptions(cReq, true);

            const connectList = [];
            remoteOptions && connectList.push(remoteOptions);
            localOptions && connectList.push(localOptions);
    
            Promise.race(connectList.map(v => this.connect(v))).then((socket: net.Socket) => {
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                socket.write(head);
                cSock.pipe(new this.Cipher, {end: false}).pipe(socket);
                socket.pipe(new this.Decipher).pipe(cSock);
            }, (err) => {
                cSock.end();
            }).catch(err => {});
        }
    }

    public getServerProxy() {
        return async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
            const encodedPath = cReq.url;
            const path = (new this.Decipher).decode(encodedPath);
            const options = parse(path.indexOf('http') ? 'http://' + path: path);
    
            const sSock = net.connect(Number(options.port) || 80, options.hostname, () => {
                sSock.removeAllListeners('timeout');
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                sSock.write(head);
                cSock.pipe(new this.Decipher).pipe(sSock);
                sSock.pipe(new this.Cipher).pipe(cSock);
            }).on('error', (e) => {
                setTimeout(() => {
                    cSock.destroy(e);
                }, 5000);
            }).on('end', () => {
                cSock.end();
            }).setTimeout(5000, () => {
                cSock.destroy(new Error('timeout'));
            });
    
            cSock.on('error', (e) => {
                console.log(e)
                sSock.connecting && sSock.destroy(e);
            }).on('end', () => {
                sSock.connecting && sSock.end();
            })
        }
    }

    private assembleOptions(cReq: http.IncomingMessage, local?: Boolean) {
        const path = cReq.url.replace(/^http:\/\//, '');
        const encodedPath = (new this.Cipher).encode(path);
        const clientConfig = this.config.client;

        try {
            return {
                hostname: local ? 'localhost' : clientConfig.remote[clientConfig.onuse].host,
                port: local ? this.config.server.port || 5555 : clientConfig.remote[clientConfig.onuse].port,
                method: 'connect',
                path: encodedPath,
                inner: {
                    httpVersion: cReq.httpVersion,
                    method: cReq.method,
                    path: path,
                    headers: cReq.headers
                }
            };
        } catch (e) {}
    }

    private connect(options, sendHeaders?) {
        return new Promise((resolve, reject) => {
            const request = http.request(options)
            .on('connect', (res: http.IncomingMessage, sock: net.Socket, head: Buffer) => {
                request.removeAllListeners('timeout');
                sock.on('error', err => {
                    console.log('server side error', err);
                });
                resolve(sock);

                if (sendHeaders) {
                    let headers = this.assembleHeaders(options);
                    string2readable(headers).pipe(new this.Cipher).pipe(sock);
                }
            }).on('error', err => {
                reject(err);
            }).setTimeout(5000, () => {
                request.abort();
                reject(new Error('timeout'));
            });

            request.flushHeaders();
        });
    }

    private assembleHeaders(opts) {
        const uri = parse('http://' + (opts.inner && opts.inner.path || opts.path));
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
}
