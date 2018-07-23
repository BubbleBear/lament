import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import Config from './lib/config';

const config: any = new Config;

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('connect', proxyFacotry.getServerProxy())
    .on('clientError', (err, sock) => {
        console.log('SERVER handler error: ', err.message);
        sock.destroy();
    })
    .listen(config.server.listen);

export const client = http.createServer()
    .on('request', proxyFacotry.getLegacyProxy())
    .on('connect', proxyFacotry.getConnectProxy())
    .on('clientError', (err, sock) => {
        console.log('CLIENT handler error: ', err.message);
        sock.destroy();
    })
    .listen(config.client.listen);
