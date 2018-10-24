import * as net from 'net';
import * as fs from 'fs';
import { Url } from 'url';
import { connect, TLSSocket } from 'tls';

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
            socket.destroy()
            // tag && console.log(`${tag}: ${e.message}`);
        });
}

export async function verifyCertificates(url: { hostname, port} | Url): Promise<any> {
    return new Promise((resolve, reject) => {
        const socket: TLSSocket = connect({
            host: url.hostname,
            port: url.port || 443,
            rejectUnauthorized: false,
            servername: url.hostname,
        }, () => {
            resolve(socket.authorized as Boolean);
        })
        
        socket
            .on('error', (err) => {
                resolve(true);
            })
            .end('hello');
    });
}
