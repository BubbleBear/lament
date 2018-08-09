#!/usr/bin/env bash

PASSWD='angingian'

PRE_IFS=$IFS

IFS=

services=()
service_str=`networksetup -listallnetworkservices | sed -n '2,$p'`

i=0
while [ $service_str != ${service_str#*$'\n'} ];do
    services[i]=${service_str%%$'\n'*}
    service_str=${service_str#*$'\n'}
    ((i++))
done
services[i+1]=$service_str

proxies_off() {
    for service in ${services[@]}; do
        echo "$PASSWD" | sudo -S networksetup -setwebproxystate $service off
        echo "$PASSWD" | sudo -S networksetup -setsecurewebproxystate $service off
        echo "$PASSWD" | sudo -S networksetup -setsocksfirewallproxystate $service off
        echo "$PASSWD" | sudo -S networksetup -setautoproxystate $service off
    done
}

proxies_on() {
    for service in ${services[@]}; do
        echo "$PASSWD" | sudo -S networksetup -setwebproxystate $service on
        echo "$PASSWD" | sudo -S networksetup -setsecurewebproxystate $service on
        echo "$PASSWD" | sudo -S networksetup -setwebproxy $service 127.0.0.1 6666
        echo "$PASSWD" | sudo -S networksetup -setsecurewebproxy $service 127.0.0.1 6666
    done
}

IFS=$PRE_IFS
