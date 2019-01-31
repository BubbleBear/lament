import { Transform } from 'stream';

export abstract class Cypher extends Transform {
    constructor(options?) {
        super(options);

        this
            .on('error', (error) => {
                console.log('cypher error: ', error)
                this.destroy();
            })
            .on('finish', () => {
                this.push(null);
            });
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

export interface Encryptor extends Cypher {
    encode(target: Buffer | string): string;
}

export interface EncryptorConstructor {
    new (): Encryptor;
}

export declare const Encryptor: EncryptorConstructor;

export interface Decryptor extends Cypher {
    decode(target: Buffer | string): string;
}

export interface DecryptorConstructor {
    new (): Decryptor;
}

export declare const Decryptor: DecryptorConstructor;

export class DefaultEncryptor extends Cypher implements Encryptor {
    protected handler(chunk: Buffer): Buffer {
        return Buffer.from(this.encode(chunk), 'binary');
    }

    public encode(target: Buffer | string): string  {
        typeof target === 'string' && (target = Buffer.from(target, 'binary'));
        return this.reverseBit(target).toString('hex');
    }
}

export class DefaultDecryptor extends Cypher implements Decryptor {
    protected handler(chunk: Buffer): Buffer {
        return Buffer.from(this.decode(chunk), 'binary');
    }

    public decode(target: Buffer | string): string {
        target instanceof Buffer && (target = target.toString('binary'));
        return this.reverseBit(Buffer.from(target, 'hex')).toString('binary');
    }
}
