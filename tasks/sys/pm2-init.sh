#!/bin/bash

# Description: xTuple Mobile Web Service Manager
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
  echo -e 'xTuple Service Manager'
  echo -e ''

  #echo -e 'Usage: sudo service xtuple {start|stop|status|restart}'
  #echo -e 'Examples:  '
  #echo -e '   Restart all xTuple services:    sudo service xtuple restart'
  #echo -e '   Display xTuple status:          sudo service xtuple status'
  #echo -e ''
  echo -e 'Usage: sudo service xtuple <version> <name> {restart|status}'
  echo -e 'Examples:'
  echo -e '   Restart xTuple Server for customer "initech":     sudo service xtuple 4.4.0 initech restart'
  echo -e '   Show xTuple Server status for customer "initech": sudo service xtuple 4.4.0 initech status'
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
  help
elif [[ -z $action && -z $account ]]; then
  action=$version
  account="root"
elif [[ -z $action ]]; then
  help
fi

export PATH=$PATH:/usr/bin

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
  super $PM2 restart xtuple-postgres-$version-$account
  super $PM2 restart xtuple-monitor-$version-$account || true
  super $PM2 restart xtuple-snapshotmgr-$version-$account || true
}

status() {
  echo 'xTuple Mobile Web Status Dashboard'
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
    status)
        status
        ;;
    restart)
        restart
        ;;
    *)
        help
        exit 1
        ;;
esac
exit $RETVAL
