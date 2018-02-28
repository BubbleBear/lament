# lament
a tunneling proxy based on connect method
<pre>
it's still a prototype and to be polished in future yet.

before running the scripts you need to create 2 config files, one named
client.config.json, another server.config.json.
in client.config.json there should be infomations like below:
{
    "client": {
        "port": some port
    },
    "servers": [{
        "hostname": some hostname,
        "port": some port
    }],
    "onuse": the index of server on use ,for example 0
}

and in server.config.json:
{
    "port": some port
}
if the server config is an empty json, 5555 will be used as default port

and then mv to the program directory, run
'node proxy/proxy-server'
on your server,
'node proxy/proxy-client'
on your local machine
</pre>
