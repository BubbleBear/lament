import { Transform } from 'stream';

export abstract class Dummy extends Transform {
    constructor(options?) {
        super(options);

        this
        .on('error', err => {
            console.log('cipher error: ', err)
            this.destroy();
        })
        .on('end', () => {
            this.push(null);
        })
    }

    _transform(chunk, encoding, callback) {
        this.push(this.handler(chunk), encoding);
        callback();
    }

    protected abstract handler(chunk: Buffer): Buffer;

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
