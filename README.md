# lament
a tunneling proxy based on connect method

it's still a prototype and to be polished in the future yet.

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
        "onuse": the index of server on use ,for example 0
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
