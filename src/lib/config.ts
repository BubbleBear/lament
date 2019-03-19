export interface Config {
    client: {
        listen: number;
        remotes: {
            host: string;
            port: string;
        }[];
        enforce: {
            [prop: string]: number;
        };
        timeout: number;
    };
    server: {
        listen: number;
        timeout: number;
    };
    [prop: string]: any;
}

let instance: Config;

export class Config {
    constructor() {
        return Config.singleton();
    }

    private static singleton() {
        if (instance instanceof Config === false) {
            instance = this.merge(this.default(), this.custom());
        }

        return instance;
    }

    private static merge(obj1, obj2) {
        const merged = Object.assign({}, obj1, obj2);
        Object.keys(merged).forEach((k) => {
            typeof obj1[k] === 'object' && typeof obj2[k] === 'object'
            && (
                Array.isArray(obj1[k]) && Array.isArray(obj2[k])
                && (merged[k] = (<Array<any>>obj1[k]).concat(obj2[k]))
                || (merged[k] = this.merge(obj1[k], obj2[k]))
            );
        })
        return merged;
    }

    private static default() {
        return {
            client: {
                listen: 6666,
                remotes: [
                    {
                        host: 'localhost',
                        port: 5555,
                    },
                ],
                enforce: {},
                timeout: 3000,
            },
            server: {
                listen: 5555,
                timeout: 30000,
            },
        };
    }

    private static custom() {
        const config = {};
        try {
            (<any>config).client = require('../../config/client.json');
        } catch (e) {
            console.log('failed to load client config, using default.');
        }
        try {
            (<any>config).server = require('../../config/server.json');
        } catch (e) {
            console.log('failed to load server config, using default.');
        }
        return config;
    }
}

const config = new Config;

export default config;
