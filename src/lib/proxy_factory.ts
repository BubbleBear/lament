import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';

import { promise, verifyCertificates, getHeaderString } from './utils';
import { Encryptor, EncryptorConstructor, Decryptor, DecryptorConstructor, DefaultEncryptor, DefaultDecryptor } from './encryption';
import Tunnel from './tunnel';
import Config from './config';

export default class ProxyFactory {
    private config: Config;

    private tunnel: Tunnel;

    private Encryptor: EncryptorConstructor;

    private Decryptor: DecryptorConstructor;

    constructor(config: Config) {
        this.config = config;
        this.Encryptor = config.Encryptor || DefaultEncryptor;
        this.Decryptor = config.Decryptor || DefaultDecryptor;
        this.tunnel = new Tunnel(config);
    }

    public requestHandler = async (cReq: http.IncomingMessage, cRes: http.ServerResponse) => {
        try {
            const socket: net.Socket = <any>await this.tunnel.race(cReq);

            cReq.connection.on('error', (e) => {
                cReq.connection.destroy();
                this.config.verbose && console.log(`client request socket error: ${e.message}, url: ${cReq.url}`);
            });

            cRes.connection
                .on('error', (e) => {
                    cRes.connection.destroy();
                    this.config.verbose && console.log(`client response socket error: ${e.message}, url: ${cReq.url}`);
                })
                .on('close', () => {
                    socket.end();
                })

            cReq.pipe(new this.Encryptor).pipe(socket, { end: false });
            socket.pipe(new this.Decryptor).pipe(cRes.connection);
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
            const socket: net.Socket = <any>await this.tunnel.race(cReq);

            cSock.on('error', (e) => {
                cSock.destroy();
                this.config.verbose && console.log(`client connect error: ${e.message}, url: ${cReq.url}`);
            })

            cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
            socket.write(head);
            cSock.pipe(new this.Encryptor).pipe(socket);
            socket.pipe(new this.Decryptor).pipe(cSock);
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

        const cert: Boolean = await verifyCertificates(options);
        
        const sSock = (new net.Socket)
            .on('connect', () => {
                sSock.removeAllListeners('timeout');
                cSock.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                sSock.write(head);
                cSock.pipe(new this.Decryptor).pipe(sSock);
                sSock.pipe(new this.Encryptor).pipe(cSock);
            })
            .on('error', (e) => {
                sSock.destroy();
                this.config.verbose && console.log(`server request error: ${e.message}`);
            })
            .setTimeout(this.config.server.timeout, () => {
                cSock.end();
                sSock.destroy(new Error(`server timeout, host: ${path}`));
            });

        cSock.on('error', (e) => {
            cSock.destroy();
            this.config.verbose && console.log(`server response error: ${e.message}`);
        });

        if (cert === true) {
            sSock.connect({
                port: Number(options.port) || 80,
                host: options.hostname,
            });
        }
    }
}
