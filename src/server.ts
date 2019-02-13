import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import config from './lib/config';

const proxyFacotry = new ProxyFacotry(config);

const server = http.createServer()
    .on('listening', () => {
        console.log(`server listening on: ${config.server.listen}`)
    })
    .on('connect', proxyFacotry.serverHandler)
    .on('clientError', (error, sock) => {
        console.log('SERVER handler error: ', error);
        sock.destroy();
    })
    .listen(config.server.listen);

export default server;
