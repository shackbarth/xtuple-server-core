#!/bin/bash

# Description: xTuple Service Manager
# processname: xtuple
#
### BEGIN INIT INFO
# Provides:          pm2
# Required-Start: $local_fs $remote_fs
# Required-Stop: $local_fs $remote_fs
# Should-Start: $network
# Should-Stop: $network
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description: xtuple service script
# Description: xTuple Mobile Web Service Manager
### END INIT INFO

help() {
  echo -e 'xTuple Service'
  echo -e ''

  #echo -e 'Usage: service xtuple {start|stop|status|restart}'
  #echo -e 'Examples:  '
  #echo -e '   Restart all xTuple services:    service xtuple restart'
  #echo -e '   Display xTuple status:          service xtuple status'
  #echo -e ''
  echo -e 'Usage: service xtuple <version> <name> {restart|status|help}'
  echo -e ''
  echo -e 'xTuple Log Path: /var/log/xtuple/<version>/<name>'
  echo -e 'xTuple Config Path: /etc/xtuple/<version>/<name>'
  echo -e ''
  echo -e 'Postgres Service'
  echo -e 'Usage: pg_ctlcluster 9.3 <name> {start|stop|restart}'
  echo -e ''
  echo -e 'Postgres Log Path: /var/log/postgresql/'
  echo -e ''
  echo -e 'Still having trouble? Email us: <dev@xtuple.com>'
  echo -e ''
  
  exit 1
}

PM2=$(which pm2)

version="$1"
account="$2"
action="$3"

if [[ -z $action || -z $account || -z $version ]]; then
  help
fi

export PATH=$PATH:/usr/bin
export HOME=/usr/local/$account

super() {
  sudo -u $account PATH=$PATH $*
}

start() {
  echo -e "Starting all xTuple services..."
  super $PM2 resurrect
}

stop() {
  echo -e "Stopping all xTuple services..."
  super $PM2 dump
  super $PM2 stop xtuple-server-$version-$account > /dev/null 2>&1
  super $PM2 stop xtuple-healthfeed-$version-$account > /dev/null 2>&1
  super $PM2 stop xtuple-snapshotmgr-$version-$account > /dev/null 2>&1
  echo -e "Done."
}

restart() {
  echo -e "Restarting al xTuple services..."
  super $PM2 dump
  super $PM2 restart xtuple-server-$version-$account > /dev/null 2>&1
  super $PM2 restart xtuple-healthfeed-$version-$account > /dev/null 2>&1
  super $PM2 restart xtuple-snapshotmgr-$version-$account > /dev/null 2>&1
  status
}

status() {
  echo ''
  list=$(super $PM2 list)
  if [[ -z $list ]]; then
    help
  else
    echo 'xTuple Server Dashboard'
    echo "$list" | head -n 3 && echo "$list" | grep $account -A 1
  fi

  RETVAL=$?
}

case "$action" in
  start)
      start
      ;;
  stop)
      stop
      ;;
  restart)
      restart
      ;;
  status)
      status
      ;;
  *)
      help
      ;;
esac
exit $RETVAL
