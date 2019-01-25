#!/usr/bin/env bash

PRE_IFS=$IFS
IFS=

services=()
service_str=`networksetup -listallnetworkservices | sed -n '2,$p'`

while read service; do services+=("$service"); done <<< $service_str

proxies_off() {
    for service in ${services[@]}; do
        networksetup -setwebproxystate $service off
        networksetup -setsecurewebproxystate $service off
        networksetup -setsocksfirewallproxystate $service off
        networksetup -setautoproxystate $service off
    done
}

proxies_on() {
    for service in ${services[@]}; do
        networksetup -setwebproxystate $service on
        networksetup -setsecurewebproxystate $service on
        networksetup -setwebproxy $service 127.0.0.1 6666 off
        networksetup -setsecurewebproxy $service 127.0.0.1 6666 off
    done
}
