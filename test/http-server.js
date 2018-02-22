const http = require('http');

const SERVER_PORT = 5004;

function helloWorld() {
    console.log('hello world');
}

const server = http.createServer((req, res) => {
    const ip = res.socket.remoteAddress;
    const port = res.socket.remotePort;
    helloWorld()
    res.end(`${req.socket.remoteAddress}:${req.socket.remotePort}`);
}).listen(SERVER_PORT);
