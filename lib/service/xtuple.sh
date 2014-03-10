#!/bin/bash
#/etc/init.d/xtuple

version="$1"
name="$2"

forever_logfile=/etc/xtuple/forever.log
forever_opts="-a --minUptime 5000 --spinSleepTime 5000"
home=usr/local/xtuple/
appdir=$home/src/$version/$name
xtuple_logfile=/var/log/xtuple/$version/$name/access.log
xtuple_errfile=/var/log/xtuple/$version/$name/error.log
xtuple_config=/etc/xtuple/$version/$name/config.js
xtuple_main=/usr/sbin/xtuple/$version/$name/main.js

case "$3" in
start)
  [[ -z $version ]] && continue
  [[ -z $name ]] && continue

  sudo -u xtuple forever start $forever_opts \
    -l $forever_logfile -o $xtuple_logfile -e $xtuple_errfile \
    $xtuple_server -c $xtuple_config

  # TODO maybe also control nginx and pgcluster from here?
  ;;

stop)
  [[ -z $version ]] && continue
  [[ -z $name ]] && continue

  sudo -u xtuple forever stop \
    $xtuple_server -c $xtuple_config

  ;;

*)
  echo -e "Usage: service xtuple <version> <name> {start|stop}"
  exit 1
  ;;

esac

exit 0
