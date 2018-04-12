const http = require('http');
const tunnelProxyWrapper = require('./proxy/tunnel_proxy');

global['config'] = require('./server.config');

const server = http.createServer()
    .on('connect', tunnelProxyWrapper())
    .listen(global.config.port || 5555);
