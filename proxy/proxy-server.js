const http = require('http');
const legacyProxyWrapper = require('./legacy-proxy');
const tunnelProxyWrapper = require('./tunnel-proxy');

const PROXY_PORT = 5555;

const server = http.createServer()
    .on('connect', tunnelProxyWrapper())
    .listen(PROXY_PORT);
