import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import Config from './lib/config';

const config: any = new Config;

// console.dir(config, { depth: null });

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('listening', () => {
        console.log(`listening on: ${config.server.listen}`)
    })
    .on('connect', proxyFacotry.getServerHandler())
    .on('clientError', (err, sock) => {
        console.log('SERVER handler error: ', err);
        sock.destroy();
    })
    .listen(config.server.listen);

export const client = http.createServer()
    .on('request', proxyFacotry.getRequestHandler())
    .on('connect', proxyFacotry.getConnectHandler())
    .on('clientError', (err, sock) => {
        console.log('CLIENT handler error: ', err);
        sock.destroy();
    })
    .listen(config.client.listen);
