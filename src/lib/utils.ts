const stream = require('stream');

export function string2readable(string) {
    const readable = new stream.Readable({read: () => {}});
    readable.on('error', err => {console.log(`error in string2readable\n${err}`)});
    readable.push(string);
    return readable;
}

export const promise = {
    shortCircuit<T>(promises: Promise<T>[]): Promise<T> {
        return new Promise((resolve, reject) => {
            for (const promise of promises) {
                promise.then(result => {
                    resolve(result);
                }, error => {});
            }
        })
    },
};
