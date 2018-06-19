import * as http from 'http';
import * as net from 'net';
import { parse } from 'url';
import { Transform } from 'stream';
import string2readable = require('./string2readable');
import tunnelCurl = require('./tunnel_curl');
import DummyCipher = require('./dummy');

export default class ProxyFactory {
    private config;

    private Cipher: typeof Transform;

    private Decipher: typeof Transform;

    constructor(config, options?) {
        options || (options = {});
        this.config = config;
        this.Cipher = options.Cipher || DummyCipher;
        this.Decipher = options.Decipher || DummyCipher;
    }

    public getLegacyProxy() {
        return (cReq, cRes) => {
            const remoteOptions = this.assembleOptions(cReq);
            const localOptions = Object.assign({}, remoteOptions);
            localOptions.hostname = 'localhost';
            localOptions.port = this.config.server.port || 5555;
            
            Promise.race([tunnelCurl(remoteOptions, 1), tunnelCurl(localOptions, 1)]).then((socket) => {
                cReq.pipe(new this.Cipher(), {end: false}).pipe(socket);
                socket.pipe(new this.Decipher).pipe(cRes.socket);
            }, (err) => {
                cRes.writeHead(400, err.message || err);
                cRes.end();
            }).catch(err => {
                console.log(err);
            });
        };
    }

    public getTunnelProxy() {
        return (cReq, cSock, head) => {
            const remoteOptions = this.assembleOptions(cReq);
            const localOptions = Object.assign({}, remoteOptions);
            localOptions.hostname = 'localhost';
            localOptions.port = this.config.server.port || 5555;
    
            Promise.race([tunnelCurl(remoteOptions), tunnelCurl(localOptions)]).then((socket) => {
                string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
                string2readable(head).pipe(socket);
                cSock.pipe(new this.Cipher(), {end: false}).pipe(socket);
                socket.pipe(new this.Decipher()).pipe(cSock);
            }, (err) => {
                cSock.end();
            }).catch(err => {
                console.log(err);
            });
        }
    }

    public getServerProxy() {
        return (cReq, cSock, head) => {
            const encodedPath = cReq.url;
            const path = this.reverse(Buffer.from(decodeURI(encodedPath))).toString();
            const options = parse(path.indexOf('http') ? 'http://' + path: path);
    
            const sSock = net.connect(Number(options.port) || 80, options.hostname, () => {
                sSock.removeAllListeners('timeout');
                string2readable('HTTP/1.1 200 Connection Established\r\n\r\n').pipe(cSock);
                string2readable(head).pipe(sSock);
                cSock.pipe(new this.Decipher()).pipe(sSock);
                sSock.pipe(new this.Cipher()).pipe(cSock);
            }).on('error', (e) => {
                setTimeout(() => {
                    cSock.destroy(e);
                }, 5000);
                console.log(`tunnel_proxy sSock error\n`, path, e);
            }).on('end', () => {
                cSock.end();
            }).setTimeout(5000, () => {
                cSock.destroy(new Error('timeout'));
                console.log(`tunnel_proxy timeout\n`, path);
            });
    
            cSock.on('error', (e) => {
                sSock.connecting && sSock.destroy(e);
                console.log(`tunnel_proxy cSock error\n`, path, e);
            }).on('end', () => {
                sSock.connecting && sSock.end();
            })
        }
    }

    private assembleOptions(cReq) {
        const path = cReq.url.replace(/^http:\/\//, '');
        const encodedPath = encodeURI(this.reverse(Buffer.from(path)).toString());
        const clientConfig = this.config.client;

        return {
            hostname: clientConfig.remote[clientConfig.onuse].host,
            port: clientConfig.remote[clientConfig.onuse].port,
            method: 'connect',
            path: encodedPath,
            inner: {
                httpVersion: cReq.httpVersion,
                method: cReq.method,
                path: path,
                headers: cReq.headers,
                Cipher: this.Cipher
            }
        };
    }

    private reverse(chunk) {
        return chunk.map((v) => {
            return v ^ 1;
        })
    }
}
