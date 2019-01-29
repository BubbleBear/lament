import * as http from 'http';
import * as net from 'net';

import { promise, getHeaderString } from './utils';
import { Encryptor, Decryptor, DefaultEncryptor, DefaultDecryptor } from './encryption';
import Config from './config';

export interface RemoteOptions {
    host: string;
    port: string;
}

export default class Tunnel {
    private config: Config;

    private Cryptor: typeof Encryptor;

    private Decryptor: typeof Decryptor;

    constructor(config: Config) {
        this.config = config;
        this.Cryptor = config.Cryptor || DefaultEncryptor;
        this.Decryptor = config.Decryptor || DefaultDecryptor;
    }

    public async race(req: http.IncomingMessage, remotes: RemoteOptions[] = this.config.client.remotes) {
        for (const k of Object.keys(this.config.client.enforce)) {
            if (req.url.indexOf(k) != -1) {
                const remote = remotes[this.config.client.enforce[k]];
                return this.connect(req, remote);
            }
        }

        return promise.or(
            remotes.map(
                remote => this.connect(req, remote)
            )
        );
    }

    public connect(req: http.IncomingMessage, remote: RemoteOptions): Promise<net.Socket> {
        const options = this.getOptions(req, remote);

        return new Promise((resolve, reject) => {
            const request = http.request(options)
                .on('connect', (res: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
                    resolve(socket);

                    socket
                        .on('pipe', (src: net.Socket) => {
                            request.removeAllListeners('timeout');
                            if (req.method !== 'CONNECT') {
                                src.pause();
                                const headers = getHeaderString(options.inner);
                                socket.write((new this.Cryptor).encode(headers), () => {
                                    src.resume();
                                });
                            }
                        })
                        .on('error', (e) => {
                            socket.destroy();
                            this.config.verbose && console.log(`tunneling error: ${e.message}, url: ${req.url}`);
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

    private getOptions(req: http.IncomingMessage, remote: RemoteOptions) {
        const path = req.url.replace(/^http:\/\//, '');
        const encodedPath = (new this.Cryptor).encode(path);

        return {
            hostname: remote ? remote.host : 'localhost',
            port: remote ? remote.port : this.config.server.listen || 5555,
            method: 'connect',
            path: encodedPath,
            headers: req.httpVersion == '1.1' ? {
                // 'Connection': 'keep-alive',
                // 'Proxy-Connection': 'keep-alive',
            } : {},
            inner: {
                httpVersion: req.httpVersion,
                method: req.method,
                path: path,
                headers: req.headers,
            },
        };
    }
}
