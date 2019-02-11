import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import Config from './lib/config';

const config: any = new Config;

config.verbose = true;

// console.dir(config, { depth: null });

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('connect', proxyFacotry.serverHandler)
    .on('clientError', (err, sock) => {
        console.log('SERVER handler error: ', err);
        sock.destroy();
    })
    .listen(config.server.listen);

export const client = http.createServer()
    .on('listening', () => {
        console.log(`listening on: ${config.client.listen}`)
    })
    .on('request', proxyFacotry.requestHandler)
    .on('connect', proxyFacotry.connectHandler)
    .on('clientError', (err, sock) => {
        console.log('CLIENT handler error: ', err);
        sock.destroy();
    })
    .listen(config.client.listen);
