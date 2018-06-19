# lament
a tunneling proxy based on connect method
<pre>
NOT STABLE ON WINDOWS PLATFORM YET!!

it's still a prototype and to be polished in the future yet.

before running the scripts you need to create 2 config files, one named
config/client.json, another config/server.json.
in config/client.json there should be infomations like below:
{
    "client": {
        "port": some port
    },
    "servers": [{
        "host": some host,
        "port": some port
    }],
    "onuse": the index of server on use ,for example 0
}

and in config/server.json:
{
    "port": some port
}
if the server config is an empty json, 5555 will be used as default port

and then mv to the program directory, run
'node server.js' on your server,
both 'node client.js' and 'node server.js' on your local machine
</pre>
