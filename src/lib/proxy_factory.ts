import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';
import { Transform, Readable, Writable } from 'stream';
import { string2readable, promise } from './utils';
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
            this.abstractProxy(cReq).then((socket: net.Socket) => {
                this.connectionBridge(cReq.connection, socket, 'request socket');

                cReq.connection.pipe(new this.Cipher, { end: false }).pipe(socket);
                socket.pipe(new this.Decipher).pipe(cRes.connection);
            }).catch(err => {
                console.log('promise rejected: ', err)
                cRes.writeHead(400, err.message || 'unknown error with lament');
                cRes.end();
            });
        };
    }

    public getTunnelProxy() {
        return async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
            this.abstractProxy(cReq).then((socket: net.Socket) => {
                this.connectionBridge(cSock, socket, 'tunnel socket');

                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                socket.write(head);
                cSock.pipe(new this.Cipher, { end: false }).pipe(socket);
                socket.pipe(new this.Decipher).pipe(cSock);
            }).catch(err => {
                console.log('promise rejected: ', err)
                cSock.end();
            });
        }
    }

    private async abstractProxy(cReq: http.IncomingMessage, ...args) {
        const remoteOptions = this.assembleOptions(cReq);
        const localOptions = this.assembleOptions(cReq, true);

        const connectList = [];
        remoteOptions && connectList.push(remoteOptions);
        localOptions && connectList.push(localOptions);

        return promise.shortCircuit(
            connectList.map(
                v => this.connect(v, cReq.method != 'CONNECT')
            )
        );
    }

    public getServerProxy() {
        return async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
            const encodedPath = cReq.url;
            const path = (new this.Decipher).decode(encodedPath);
            const options = parse(path.indexOf('http') ? 'http://' + path : path);

            const sSock = net.connect(Number(options.port) || 80, options.hostname, () => {
                sSock.removeAllListeners('timeout');
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                sSock.write(head);
                cSock.pipe(new this.Decipher).pipe(sSock);
                sSock.pipe(new this.Cipher).pipe(cSock);
            }).setTimeout(5000, () => {
                cSock.destroy(new Error('server timeout'));
            });

            this.connectionBridge(sSock, cSock, 'sSock');

            this.connectionBridge(cSock, sSock, 'cSock');
        }
    }

    private connectionBridge(src: net.Socket, dest: net.Socket, tag?: string): net.Socket {
        return src
            .on('error', e => {
                console.log(tag, e.message)
                src.destroy();
            })
            .on('end', () => {
                console.log(tag, 'ended')
                src.end();
            })
            .on('close', () => {
                console.log(tag, 'closed')
                dest.end();
            })
    }

    private assembleOptions(cReq: http.IncomingMessage, local?: Boolean) {
        const path = cReq.url.replace(/^http:\/\//, '');
        const encodedPath = (new this.Cipher).encode(path);
        const clientConfig = this.config.client;

        return {
            hostname: local ? 'localhost' : clientConfig.remotes[clientConfig.onuse].host,
            port: local ? this.config.server.listen || 5555 : clientConfig.remotes[clientConfig.onuse].port,
            method: 'connect',
            path: encodedPath,
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
                path: path,
                headers: cReq.headers
            }
        };
    }

    private connect(options, sendHeaders?) {
        return new Promise((resolve, reject) => {
            const request = http.request(options)
                .on('connect', (res: http.IncomingMessage, sock: net.Socket, head: Buffer) => {
                    resolve(sock);
                    sock
                        .on('error', err => {
                            console.log('connect socket error', err.message);
                            sock.destroy()
                        })
                        .on('end', () => {
                            sock.end();
                        })
                        .on('pipe', (src) => {
                            request.removeAllListeners('timeout');
                        })

                    if (sendHeaders) {
                        let headers = this.assembleHeaders(options);
                        string2readable(headers).pipe(new this.Cipher).pipe(sock);
                    }
                })
                .on('error', err => {
                    reject(err);
                    request.abort();
                })
                .setTimeout(5000, () => {
                    request.emit('error', new Error('client timeout'));
                });

            request.flushHeaders();
        });
    }

    private assembleHeaders(opts) {
        const uri = parse('http://' + (opts.inner && opts.inner.path || opts.path));
        const method = opts.inner && opts.inner.method && opts.inner.method.toUpperCase() || 'GET';
        const httpVersion = opts.inner && opts.inner.httpVersion || 1.1;

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
