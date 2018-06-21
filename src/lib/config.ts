export default class Config {
    constructor() {
        return <any>Object.assign({}, this.default(), this.importConfig());
    }

    private default() {
        return {
            client: {
                listen: 6666,
                remotes: [],
                onuse: null,
            },
            server: {
                listen: 5555,
            },
        }
    }

    private importConfig() {
        const config = {};
        try {
            (<any>config).client = require('../config/client.json');
        } catch (e) {
            console.log('failed to load client config, using default.');
        }
        try {
            (<any>config).server = require('../config/server.json');
        } catch (e) {
            console.log('failed to load server config, using default.');
        }
        return config;
    }
}
