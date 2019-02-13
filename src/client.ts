import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import config from './lib/config';

const proxyFacotry = new ProxyFacotry(config);

const client = http.createServer()
    .on('listening', () => {
        console.log(`client listening on: ${config.client.listen}`)
    })
    .on('request', proxyFacotry.requestHandler)
    .on('connect', proxyFacotry.connectHandler)
    .on('clientError', (error, sock) => {
        console.log('CLIENT handler error: ', error);
        sock.destroy();
    })
    .listen(config.client.listen);

export default client;
