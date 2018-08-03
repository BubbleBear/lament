import * as net from 'net';

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

export function catchError(socket: net.Socket, tag?: string) {
    return socket
        .on('error', (e: Error) => {
            tag && console.log(`${tag}: ${e.message}`);
        });
}
