const http = require('http');
const requestForwardWrapper = require('./request-forward');
const connectForwardWrapper = require('./connect-forward');

global['config'] = require('../config');

const server = http.createServer()
    .on('request', requestForwardWrapper())
    .on('connect', connectForwardWrapper())
    .listen(config.client.port);
