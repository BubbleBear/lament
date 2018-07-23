const stream = require('stream');

export function string2readable(string) {
    const readable = new stream.Readable({ read: () => { } });
    readable.on('error', (err: Error) => { console.log(`string2readable error: ${err.message}`) });
    readable.push(string);
    readable.push(null);
    return readable;
}

export const promise = {
    or<T>(promises: Promise<T>[]): Promise<T> {
        return new Promise((resolve, reject) => {
            let rejects: Error[] = [];

            for (const promise of promises) {
                promise
                    .then((result: any) => {
                        resolve(result);
                    })
                    .catch((e: Error) => {
                        rejects.push(e);
                        rejects.length === promises.length && reject(rejects);
                    });
            }
        })
    },
};
