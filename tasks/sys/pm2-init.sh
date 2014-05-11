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

export PATH=$PATH:/usr/bin
export HOME=/usr/local/xtuple

PM2=$(which pm2)
PG_VERSION=$(psql -V | grep [[:digit:]].[[:digit:]] --only-matching)

version="$1"
account="$2"
action="$3"

if [[ $UID != 0 ]]; then
  if [[ -z $action || -z $account || -z $version ]]; then
    help
  fi
else
  if [[ ! -z $1 ]]; then
    action="$1"
  else
    help
  fi
fi

super() {
  sudo -u $account PATH=$PATH $*
}

start() {
  echo -e "Starting all xTuple services..."
  super $PM2 resurrect
  super pg_ctlcluster $PG_VERSION $account start
}

stop() {
  echo -e "Stopping all xTuple services..."
  super $PM2 dump
  super $PM2 stop xtuple-server-$version-$account > /dev/null 2>&1
  super $PM2 stop xtuple-healthfeed-$version-$account > /dev/null 2>&1
  super $PM2 stop xtuple-snapshotmgr-$version-$account > /dev/null 2>&1

  super pg_ctlcluster $PG_VERSION $account stop -m fast
  echo -e "Done."
}

restart() {
  echo -e "Restarting xTuple services..."
  super $PM2 dump
  super $PM2 restart xtuple-server-$version-$account > /dev/null 2>&1
  super $PM2 restart xtuple-healthfeed-$version-$account > /dev/null 2>&1
  super $PM2 restart xtuple-snapshotmgr-$version-$account > /dev/null 2>&1

  super pg_ctlcluster $PG_VERSION $account restart -m fast
  status
}

status() {
  echo ''
  list=$(super $PM2 list)
  clusters=$(pg_lsclusters)
  if [[ -z $list ]]; then
    help
  else
    echo 'xTuple Server Dashboard'
    if [[ $UID = 0 ]]; then
      echo "$list"
      echo "$clusters"
    else 
      echo "$list" | head -n 3 && echo "$list" | grep $account -A 1
      echo "$clusters" | head -n 1 && echo "$clusters" | grep $account
    fi
  fi

  RETVAL=$?
}
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
