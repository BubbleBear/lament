# lament
a tunneling proxy based on connect method

it's still a prototype and to be polished in the future yet.

this is simply for study purpose!

## how to deploy
before running the scripts you need to create 2 config files, one named
config/client.json, another config/server.json.
in config/client.json there should be infomations like below:

    {
        "listen": some port,
        "remotes": [{
            "host": some host,
            "port": some port
        }],
        "enforce": {
            "url": for specific url as "url" the proxy will force to use specific remote server as the index of remotes, which start from 1. while 0 means do not go through proxy
        }
    }

and in config/server.json:

    {
        "listen": some port
    }

if the server config is an empty json, 5555 will be used as default port

and then mv to the program directory, run

    npm i

to install, and run

    npm start

good to go!
