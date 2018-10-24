export default class Config {
    constructor() {
        return <any>this.merge(this.default(), this.importConfig());
    }

    private merge(obj1, obj2) {
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

    private default() {
        return {
            client: {
                listen: 6666,
                remotes: [
                    {
                        'host': 'localhost',
                        'port': 5555,
                    },
                ],
                enforce: {},
                timeout: 3000,
            },
            server: {
                listen: 5555,
                timeout: 3000,
            },
        };
    }

    private importConfig() {
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
