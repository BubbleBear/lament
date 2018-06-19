import * as http from 'http';
import ProxyFacotry from './proxy_factory';

const config = {
    client: require('../config/client.json'),
    server: require('../config/server.json'),
};

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('connect', proxyFacotry.getServerProxy())
    .listen(config.server.port || 5555);

export const client = http.createServer()
    .on('request', proxyFacotry.getLegacyProxy())
    .on('connect', proxyFacotry.getTunnelProxy())
    .listen(config.client.local.port);
