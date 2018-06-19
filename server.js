const http = require('http');
const tunnelProxyWrapper = require('./proxy/tunnel_proxy');

global['config'] = {
    client: require('./config/client.json'),
    server: require('./config/server.json'),
}

const server = http.createServer()
    .on('connect', tunnelProxyWrapper())
    .listen(global.config.server.port || 5555);
