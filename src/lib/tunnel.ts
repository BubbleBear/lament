import * as http from 'http';
import * as net from 'net';

import { promise, getHeaderString } from './utils';
import { Encryptor, Decryptor, DefaultEncryptor, DefaultDecryptor } from './cypher';
import Config from './config';

export interface RemoteOptions {
    host: string;
    port: string;
}

const INNER = Symbol.for('Tunnel.option.inner');

export default class Tunnel {
    private config: Config;

    private Encryptor: typeof Encryptor;

    private Decryptor: typeof Decryptor;

    constructor(config: Config) {
        this.config = config;
        this.Encryptor = config.Encryptor || DefaultEncryptor;
        this.Decryptor = config.Decryptor || DefaultDecryptor;
    }

    public async race(req: http.IncomingMessage, remotes: RemoteOptions[] = this.config.client.remotes) {
        // todo:
        // low performance simple implementation for now
        for (const k of Object.keys(this.config.client.enforce)) {
            if (req.url.indexOf(k) != -1) {
                const remote = remotes[this.config.client.enforce[k]];
                return this.dig(req, remote);
            }
        }

        return promise.or(
            remotes.map(
                remote => this.dig(req, remote)
            )
        );
    }

    public async dig(req: http.IncomingMessage, remote: RemoteOptions): Promise<net.Socket> {
        const options = this.getOptions(req, remote);

        return new Promise<net.Socket>((resolve, reject) => {
            const request = http.request(options)
                .on('connect', (res: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
                    resolve(socket);

                    socket
                        .on('end', () => {
                            socket.end();
                        })
                        .on('pipe', (src: net.Socket) => {
                            request.removeAllListeners('timeout');
                            if (req.method !== 'CONNECT') {
                                src.pause();
                                const headers = getHeaderString(options[INNER]);
                                socket.write((new this.Encryptor).encode(headers), () => {
                                    src.resume();
                                });
                            }
                        });
                })
                .on('error', error => {
                    reject(error);
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
        const encodedPath = (new this.Encryptor).encode(path);

        return {
            hostname: remote ? remote.host : 'localhost',
            port: remote ? remote.port : this.config.server.listen || 5555,
            method: 'connect',
            path: encodedPath,
            headers: req.httpVersion == '1.1' ? {
                // 'Connection': 'keep-alive',
                // 'Proxy-Connection': 'keep-alive',
            } : {},
            [INNER]: {
                httpVersion: req.httpVersion,
                method: req.method,
                path: path,
                headers: req.headers,
            },
        };
    }
}
