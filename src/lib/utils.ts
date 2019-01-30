import { Url } from 'url';
import { connect, TLSSocket } from 'tls';
import { parse } from 'url';

export const promise = {
    or<T>(promises: Promise<T>[]): Promise<T> {
        return new Promise((resolve, reject) => {
            let rejects: Error[] = [];

            for (const promise of promises) {
                promise
                    .then((result: any) => {
                        resolve(result);
                    })
                    .catch((error: Error) => {
                        rejects.push(error);
                        rejects.length === promises.length && reject(rejects);
                    });
            }
        });
    },
};

export async function verifyCertificates(url: { hostname, port} | Url): Promise<any> {
    return new Promise((resolve, reject) => {
        const socket: TLSSocket = connect({
            host: url.hostname,
            port: url.port || 80,
            rejectUnauthorized: false,
            servername: url.hostname,
        }, () => {
            resolve(socket.authorized as Boolean);
        });
        
        socket
            .on('error', (error) => {
                resolve(true);
                socket.destroy();
            })
            .setTimeout(1500)
            .end('hello');
    })
    .catch((error) => {
        console.log('failed verifying certificates: ', error);
        return false;
    });
}

export function getHeaderString(headerObject: any): string {
    const url = parse('http://' + headerObject.path);
    const method = headerObject && headerObject.method ? headerObject.method.toUpperCase() : 'GET';
    const httpVersion = headerObject ? headerObject.httpVersion : '1.0';

    let headerString = `${method} ${url.path} HTTP/${httpVersion}\r\n` +
        `connection: close\r\n`;
    headerObject && headerObject.headers && headerObject.headers.host || (headerObject += `host: ${url.host}\r\n`);

    if (headerObject && headerObject.headers) {
        for (const key in headerObject.headers) {
            if (key.includes('connection')) continue;
            headerString += `${key}: ${headerObject.headers[key]}\r\n`
        }
    }
    headerString += '\r\n';
    return headerString;
}
