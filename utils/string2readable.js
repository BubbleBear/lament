const stream = require('stream');

module.exports = function string2readable(string) {
    const readable = new stream.Readable({read: () => {}});
    readable.on('error', err => {console.log(`error in string2readable\n${err}`)});
    readable.push(string);
    return readable;
}
