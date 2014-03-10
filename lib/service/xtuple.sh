#!/bin/bash
#/etc/init.d/xtuple

version="$1"
name="$2"
action="$3"

forever_path=/var/lib/xtuple
forever_logfile=/var/log/xtuple/forever.log
forever_opts="-a --minUptime 5000 --spinSleepTime 5000 -p $forever_path"

if [[ -z $action && -z $name ]]; then
  action="$1"
  exec forever $action
fi

if [[ -z $action ]]; then
  echo -e "Usage: service xtuple <version> <name> {start|stop|restart|logs}"
  echo -e "Usage: service xtuple {list|stopall|restartall|config}"
  exit 1
fi

xtuple_logfile=/var/log/xtuple/$version/$name/access.log
xtuple_errfile=/var/log/xtuple/$version/$name/error.log
xtuple_config=/etc/xtuple/$version/$name/config.js
xtuple_main=/usr/sbin/xtuple/$version/$name/main.js

# TODO run as xtuple user; currently state is stored in /root/.forever
exec sudo forever $action $forever_opts -l $forever_logfile -o $xtuple_logfile -e $xtuple_errfile $xtuple_main -c $xtuple_config
