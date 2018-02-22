const stream = require('stream');

module.exports = function string2readable(string) {
    const readable = new stream.Readable({read: () => {}});
    readable.push(string);
    return readable;
}
