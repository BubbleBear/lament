import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';

import { verifyCertificates, pipe } from './utils';
import { Encryptor, Decryptor, DefaultEncryptor, DefaultDecryptor } from './cypher';
import Tunnel from './tunnel';
import { Config } from './config';

export default class ProxyFactory {
    private config: Config;

    private tunnel: Tunnel;

    private Encryptor: typeof Encryptor;

    private Decryptor: typeof Decryptor;

    constructor(config: Config) {
        this.config = config;
        this.Encryptor = config.Encryptor || DefaultEncryptor;
        this.Decryptor = config.Decryptor || DefaultDecryptor;
        this.tunnel = new Tunnel(config);
    }

    public requestHandler = async (cReq: http.IncomingMessage, cRes: http.ServerResponse) => {
        try {
            const sSock: net.Socket = await this.tunnel.race(cReq);

            const cSock = cReq.connection;

            cSock
                .on('end', () => {
                    cSock.end();
                    sSock.end();
                })
                .on('error', (error) => {
                    cSock.destroy();
                    this.config.verbose && console.log(`browser-client socket error: ${error.message}, url: ${cReq.url}`);
                });

            pipe(cReq, new this.Encryptor, {
                stream: sSock,
                options: {
                    end: false,
                },
            });
            pipe(sSock, new this.Decryptor, cSock);
        } catch (errors) {
            errors = Array.isArray(errors) ? errors.map((error: Error) => {
                return error.message;
            }).join(', ') : errors;

            this.config.verbose && console.log('promise rejected: ', errors);
            cRes.writeHead(504, errors);
            cRes.end();
        }
    }

    public connectHandler = async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
        try {
            const sSock: net.Socket = await this.tunnel.race(cReq);

            cSock
                .on('end', () => {
                    cSock.end();
                })
                .on('error', (error) => {
                    cSock.destroy();
                    this.config.verbose && console.log(`browser-client socket error: ${error.message}, url: ${cReq.url}`);
                });

            cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            sSock.write(head);
            pipe(cSock, new this.Encryptor, sSock);
            pipe(sSock, new this.Decryptor, cSock);
        } catch (errors) {
            errors = Array.isArray(errors) ? errors.map((error: Error) => {
                return error.message;
            }).join(', ') : errors;

            this.config.verbose && console.log('promise rejected: ', errors);
            cSock.end(`HTTP/1.1 504 ${errors}\r\n\r\n`);
        }
    }

    public serverHandler = async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
        const encodedPath = cReq.url;
        const path = (new this.Decryptor).decode(encodedPath);
        const options = parse(path.indexOf('http') ? 'http://' + path : path);

        // const cert: Promise<boolean> = verifyCertificates(options);
        const cert = true;

        const sSock = (new net.Socket)
            .on('end', () => {
                sSock.end();
            })
            .on('connect', async () => {
                if (await cert) {
                    sSock.removeAllListeners('timeout');
                    cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                    sSock.write(head);
                    pipe(cSock, new this.Decryptor, sSock);
                    pipe(sSock, new this.Encryptor, cSock);
                }
            })
            .on('error', (error) => {
                cSock.end();
                sSock.destroy();
                this.config.verbose && console.log(`server-destination socket error: ${error.message}`);
            })
            .setTimeout(this.config.server.timeout, () => {
                sSock.emit('error', new Error(`server-destination timeout, host: ${path}`));
            })
            .connect({
                host: options.hostname,
                port: Number(options.port) || 80,
            });

        cSock
            .on('error', (error) => {
                cSock.destroy();
                sSock.end();
                this.config.verbose && console.log(`client-server socket error: ${error.message}`);
            })
            .setTimeout(this.config.server.timeout, () => {
                cSock.emit('error', new Error(`server-client timeout`));
            });
    }
}
