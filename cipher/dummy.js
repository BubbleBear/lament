const { Transform } = require('stream');

module.exports = class Dummy extends Transform {
    constructor(options) {
        super(options);

        this.on('error', err => {
            console.log(err)
        })
    }

    _transform(chunk, encoding, callback) {
        this.push(this.reverse(chunk), encoding);
        callback();
    }

    reverse(chunk) {
        return chunk.map((v) => {
            return 128 - v;
        })
    }
}
