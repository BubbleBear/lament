import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';

import { verifyCertificates } from './utils';
import { Encryptor, Decryptor, DefaultEncryptor, DefaultDecryptor } from './cypher';
import Tunnel from './tunnel';
import Config from './config';

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
                .on('error', (error) => {
                    cSock.destroy();
                    this.config.verbose && console.log(`client request socket error: ${error.message}, url: ${cReq.url}`);
                })
                .on('close', () => {
                    sSock.destroy();
                });

            cReq.pipe(new this.Encryptor).pipe(sSock, { end: false });
            sSock.pipe(new this.Decryptor).pipe(cSock);
        } catch (errors) {
            errors = Array.isArray(errors) ? errors.map((error: Error) => {
                return error.message;
            }).join(', ') : errors;

            this.config.verbose && console.log('promise rejected: ', errors);
            cRes.writeHead(504, errors);
            cRes.end();
        }
    }

    public connectHanlder = async (cReq: http.IncomingMessage, cSock: net.Socket, head: Buffer) => {
        try {
            const sSock: net.Socket = await this.tunnel.race(cReq);

            cSock
                .on('error', (error) => {
                    cSock.destroy();
                    this.config.verbose && console.log(`client connect error: ${error.message}, url: ${cReq.url}`);
                });

            cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            sSock.write(head);
            cSock.pipe(new this.Encryptor).pipe(sSock);
            sSock.pipe(new this.Decryptor).pipe(cSock);
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

        const cert: boolean = await verifyCertificates(options);

        const sSock = (new net.Socket)
            .on('connect', () => {
                sSock.removeAllListeners('timeout');
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                sSock.write(head);
                cSock.pipe(new this.Decryptor).pipe(sSock);
                sSock.pipe(new this.Encryptor).pipe(cSock);
            })
            .on('error', (error) => {
                cSock.end();
                sSock.destroy();
                this.config.verbose && console.log(`server request error: ${error.message}`);
            })
            .setTimeout(this.config.server.timeout, () => {
                sSock.emit('error', new Error(`server timeout, host: ${path}`));
            });

        cSock
            .on('end', () => {
                cSock.end();
            })
            .on('error', (error) => {
                cSock.destroy();
                this.config.verbose && console.log(`server response error: ${error.message}`);
            });

        if (cert === true) {
            sSock.connect({
                host: options.hostname,
                port: Number(options.port) || 80,
            });
        }
    }
}
