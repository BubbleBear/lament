import * as http from 'http';
import ProxyFacotry from './lib/proxy_factory';
import Config from './lib/config';

const config: any = new Config;

const proxyFacotry = new ProxyFacotry(config);

export const server = http.createServer()
    .on('connect', proxyFacotry.getServerProxy())
    .on('error', err => {
        console.log(err);
    })
    .listen(config.server.listen);

export const client = http.createServer()
    .on('request', proxyFacotry.getLegacyProxy())
    .on('connect', proxyFacotry.getTunnelProxy())
    .on('error', err => {
        console.log(err);
    })
    .listen(config.client.listen);
