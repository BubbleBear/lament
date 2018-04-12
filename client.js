const http = require('http');
const requestForwardWrapper = require('./proxy/request_forward');
const connectForwardWrapper = require('./proxy/connect_forward');

global['config'] = require('./client.config');

const server = http.createServer()
    .on('request', requestForwardWrapper())
    .on('connect', connectForwardWrapper())
    .listen(global.config.client.port);
