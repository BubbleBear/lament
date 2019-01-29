import * as http from 'http';
import * as net from 'net';

import { promise, getHeaderString } from './utils';
import { DefaultEncryptor, DefaultDecryptor } from './encryption';
import Config from './config';

export default class Tunnel {
    private config: Config;

    private Cipher: typeof DefaultEncryptor;

    private Decipher: typeof DefaultDecryptor;

    constructor(config: Config) {
        this.config = config;
        this.Cipher = config.Cipher || DefaultEncryptor;
        this.Decipher = config.Decipher || DefaultDecryptor;
    }

    public async race(cReq: http.IncomingMessage, ...args) {
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

    public tunneling(options, sendHeaders?): Promise<net.Socket> {
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
                            this.config.verbose && console.log(`tunneling error: ${e.message}, url: ${options.url}`);
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
}
