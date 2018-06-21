import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';

const config = {
    client: null,
    server: null,
};

try {
    config.client = require('../config/client.json');
} catch (e) {
    config.client = {
        local: {
            port: 6666,
        },
    };
}

try {
    config.server = require('../config/server.json');
} catch (e) {
    config.server = {
        port: 5555,
    };
}

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('connect', proxyFacotry.getServerProxy())
    .on('error', err => {
        console.log(err);
    })
    .listen(config.server.port);

export const client = http.createServer()
    .on('request', proxyFacotry.getLegacyProxy())
    .on('connect', proxyFacotry.getTunnelProxy())
    .on('error', err => {
        console.log(err);
    })
    .listen(config.client.local.port);
