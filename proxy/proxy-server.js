const http = require('http');
const tunnelProxyWrapper = require('./tunnel-proxy');

global['config'] = require('../config');

const server = http.createServer()
    .on('connect', tunnelProxyWrapper())
    .listen(config.servers[0].port);
