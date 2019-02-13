#!/usr/bin/env node ./node_modules/ts-node/dist/bin.js

import client from './src/client';
import server from './src/server';
import config from './src/lib/config';

config.verbose = true;

server
client
