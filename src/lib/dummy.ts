import { Transform } from 'stream';

class Dummy extends Transform {
    constructor(options?) {
        super(options);

        this.on('error', err => {
            console.log(err)
        })
    }

    _transform(chunk, encoding, callback) {
        this.push(this.handler(chunk), encoding);
        callback();
    }

    protected handler(chunk: Buffer): Buffer {
        return chunk;
    }

    protected reverseBit<T extends Uint8Array>(chunk: T): T {
        return <T>chunk.map((v) => {
            return v ^ 1;
        });
    }
}

export class DummyCipher extends Dummy {
    protected handler(chunk: Buffer): Buffer {
        return Buffer.from(this.encode(chunk), 'binary');
    }

    public encode(target: Buffer | string): string  {
        typeof target === 'string' && (target = Buffer.from(target, 'binary'));
        return this.reverseBit(<Buffer>target).toString('hex');
    }
}

export class DummyDecipher extends Dummy {
    protected handler(chunk: Buffer): Buffer {
        return Buffer.from(this.decode(chunk), 'binary');
    }

    public decode(target: Buffer | string): string {
        target instanceof Buffer && (target = target.toString('binary'));
        return this.reverseBit(Buffer.from(target, 'hex')).toString('binary');
    }
}
