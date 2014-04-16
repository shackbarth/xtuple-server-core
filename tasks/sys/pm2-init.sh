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

  #echo -e 'Usage: sudo service xtuple {start|stop|status|restart}'
  #echo -e 'Examples:  '
  #echo -e '   Restart all xTuple services:    sudo service xtuple restart'
  #echo -e '   Display xTuple status:          sudo service xtuple status'
  #echo -e ''
  echo -e 'Usage: sudo service xtuple <version> <name> {restart|status|help}'
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
}

PM2=$(which pm2)

argv=$@
version=$1
account=$2
action=$3

if [[ -z $action && -z $account && -z $version ]]; then
  echo ''
elif [[ -z $action && -z $account ]]; then
  action=$version
  account="root"
elif [[ -z $action ]]; then
  echo ''
fi

export PATH=$PATH:/usr/bin
export HOME=/usr/local/xtuple

super() {
  sudo -u $account PATH=$PATH $*
}

start() {
  echo -e "Starting all xtuple services..."
  super $PM2 resurrect
}

stop() {
  echo -e "Stopping all xtuple services..."
  super $PM2 dump
  super $PM2 delete all
  super $PM2 kill
}

restart() {
  super $PM2 restart xtuple-server-$version-$account
  super $PM2 restart xtuple-healthfeed-$version-$account || true
  super $PM2 restart xtuple-snapshotmgr-$version-$account || true
  #super $PM2 restart xtuple-postgres-$version-$account
}

status() {
  echo ''
  echo 'xTuple Server Dashboard'
  list=$(super $PM2 list)
  echo "$list" | head -n 3 && echo "$list" | grep $account -A 1

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
      exit 1
      ;;
esac
exit $RETVAL
