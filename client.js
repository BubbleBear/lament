const http = require('http');
const requestForwardWrapper = require('./proxy/request_forward');
const connectForwardWrapper = require('./proxy/connect_forward');

global['config'] = {
    client: require('./config/client.json'),
    server: require('./config/server.json'),
}

const server = http.createServer()
    .on('request', requestForwardWrapper())
    .on('connect', connectForwardWrapper())
    .listen(global.config.client.local.port);
