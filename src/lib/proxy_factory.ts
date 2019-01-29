import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';
import { promise, verifyCertificates, getHeaderString } from './utils';
import { DefaultEncryptor, DefaultDecryptor } from './encryption';
import Config from './config';

const VERBOSE = true;

export default class ProxyFactory {
    private config;

    private Cipher: typeof DefaultEncryptor;

    private Decipher: typeof DefaultDecryptor;

    constructor(config: Config, options?) {
        options || (options = {});
        this.config = config;
        this.Cipher = options.Cipher || DefaultEncryptor;
        this.Decipher = options.Decipher || DefaultDecryptor;
    }

    public requestHandler = async (cReq: http.IncomingMessage, cRes: http.ServerResponse) => {
        try {
            const socket: net.Socket = <any>await this.pickTunneling(cReq);

            cReq.connection.on('error', (e) => {
                cReq.connection.destroy();
                VERBOSE && console.log(`client request socket error: ${e.message}, url: ${cReq.url}`);
            });

            cRes.connection
                .on('error', (e) => {
                    cRes.connection.destroy();
                    VERBOSE && console.log(`client response socket error: ${e.message}, url: ${cReq.url}`);
                })
                .on('close', () => {
                    socket.end();
                })

            cReq.pipe(new this.Cipher).pipe(socket, { end: false });
            socket.pipe(new this.Decipher).pipe(cRes.connection);
        } catch (errors) {
            errors = Array.isArray(errors) ? errors.map((error: Error) => {
                return error.message;
            }).join(', ') : errors;

            VERBOSE && console.log('promise rejected: ', errors);
            cRes.writeHead(504, errors);
            cRes.end();
        }
    }

    public connectHanlder = async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
        try {
            const socket: net.Socket = <any>await this.pickTunneling(cReq);

            cSock.on('error', (e) => {
                cSock.destroy();
                VERBOSE && console.log(`client connect error: ${e.message}, url: ${cReq.url}`);
            })

            cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            socket.write(head);
            cSock.pipe(new this.Cipher).pipe(socket);
            socket.pipe(new this.Decipher).pipe(cSock);
        } catch (errors) {
            errors = Array.isArray(errors) ? errors.map((error: Error) => {
                return error.message;
            }).join(', ') : errors;

            VERBOSE && console.log('promise rejected: ', errors);
            cSock.end(`HTTP/1.1 504 ${errors}\r\n\r\n`);
        }
    }

    private async pickTunneling(cReq: http.IncomingMessage, ...args) {
        const client = this.config.client;

        for (const k of Object.keys(this.config.client.enforce)) {
            if (cReq.url.indexOf(k) != -1) {
                const connect = this.getTunnelingOptions(cReq, client.remotes[client.enforce[k]]);
                return this.tunneling(connect, cReq.method != 'CONNECT');
            }
        }

        const connectList = client.remotes.map((v) => {
            return this.getTunnelingOptions(cReq, v);
        });

        return promise.or(
            connectList.map(
                v => this.tunneling(v, cReq.method != 'CONNECT')
            )
        );
    }

    public serverHandler = async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
        const encodedPath = cReq.url;
        const path = (new this.Decipher).decode(encodedPath);
        const options = parse(path.indexOf('http') ? 'http://' + path : path);

        const cert: Boolean = await verifyCertificates(options);
        
        const sSock = (new net.Socket)
            .on('connect', () => {
                sSock.removeAllListeners('timeout');
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                sSock.write(head);
                cSock.pipe(new this.Decipher).pipe(sSock);
                sSock.pipe(new this.Cipher).pipe(cSock);
            })
            .on('error', (e) => {
                sSock.destroy();
                VERBOSE && console.log(`server request error: ${e.message}`);
            })
            .setTimeout(this.config.server.timeout, () => {
                cSock.end();
                sSock.destroy(new Error(`server timeout, host: ${path}`));
            });

        cSock.on('error', (e) => {
            cSock.destroy();
            VERBOSE && console.log(`server response error: ${e.message}`);
        });

        if (cert === true) {
            sSock.connect({
                port: Number(options.port) || 80,
                host: options.hostname,
            });
        }
    }

    private getTunnelingOptions(cReq: http.IncomingMessage, options) {
        const path = cReq.url.replace(/^http:\/\//, '');
        const encodedPath = (new this.Cipher).encode(path);

        return {
            hostname: options ? options.host : 'localhost',
            port: options ? options.port : this.config.server.listen || 5555,
            method: 'connect',
            path: encodedPath,
            headers: cReq.httpVersion == '1.1' ? {
                // 'Connection': 'keep-alive',
                // 'Proxy-Connection': 'keep-alive',
            } : {},
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
                path: path,
                headers: cReq.headers,
            },
        };
    }

    private tunneling(options, sendHeaders?) {
        return new Promise((resolve, reject) => {
            const request = http.request(options)
                .on('connect', (res: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
                    resolve(socket);

                    socket
                        .on('pipe', (src: net.Socket) => {
                            request.removeAllListeners('timeout');
                            if (sendHeaders) {
                                src.pause();
                                let headers = getHeaderString(options.inner);
                                socket.write((new this.Cipher).encode(headers), () => {
                                    src.resume();
                                });
                            }
                        })
                        .on('error', (e) => {
                            socket.destroy();
                            VERBOSE && console.log(`tunneling error: ${e.message}, url: ${options.url}`);
                        });
                })
                .on('error', err => {
                    reject(err);
                    request.abort();
                })
                .setTimeout(this.config.client.timeout, () => {
                    request.emit('error', new Error('client timeout'));
                });

            request.flushHeaders();
        });
    }
}
