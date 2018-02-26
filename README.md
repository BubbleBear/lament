# lament
a tunneling proxy based on connect http method
<pre>
there needs to be config.json before you can run this script;
the config file should be like this:
{
  "client": {
    "port": some port
  },
  "servers": [
    {
      "host": some host,
      "port": some port
    }
  ]
  "server": the index of servers, eg. 0
}

and run proxy/proxy-server on your server, and proxy/proxy-client locally;
the server can also be run locally for test purpose;
</pre>
