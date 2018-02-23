const { Transform } = require('stream');

module.exports = class Dummy extends Transform {
    constructor(options) {
        super(options);

        this.on('error', err => {
            console.log(err)
        })
    }

    _transform(chunk, encoding, callback) {
        this.push(Dummy.reverse(chunk), encoding);
        callback();
    }

    static reverse(chunk) {
        return chunk.map((v) => {
            return v ^ 1;
        })
    }
}
