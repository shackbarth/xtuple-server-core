#!/bin/bash
# chkconfig: 2345 98 02
#
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
  echo -e 'Usage: sudo service xtuple {start|stop|status|restart}'
  echo -e 'Examples:  '
  echo -e '   Restart all xTuple services:    sudo service xtuple restart'
  echo -e '   Display xTuple status:          sudo service xtuple status'
  echo -e ''
  echo -e 'Usage: sudo service xtuple <version> <account> {start|stop|status|restart}'
  echo -e 'Examples:'
  echo -e '   Restart xTuple for \'initech\': sudo service xtuple 4.4.0 initech restart
  echo -e '   Show status for \'initech\':    sudo service xtuple 4.4.0 initech status
  echo -e ''
  echo -e 'Having trouble? Email us: <dev@xtuple.com>'
  echo -e ''
}

mkdir -p /var/run/postgresql
chown -R postgres:postgres /var/run/postgresql

NAME=xtuple
PM2=$(which pm2)

argv=$@
version=$1
account=$2
action=$3

if [[ -z $action && -z $account && -z $version ]]; then
  help
elif [[ -z $action && -z $account ]]; then
  action=$version
elif [[ -z $action ]]; then
  help
fi

export PATH=$PATH:/usr/bin

super() {
  sudo -u $account PATH=$PATH $*
}

start() {
  echo 'Starting $account $version...'
  super $PM2 resurrect
}

stop() {
  echo 'Stopping $account $version...'
  super $PM2 dump
  super $PM2 delete all
  super $PM2 kill
}

restart() {
  stop
  start
}

status() {
  echo 'xTuple Mobile Web Status Dashboard'
  super $PM2 list
  RETVAL=$?
}

case '$action' in
    start)
        start $version $account $action
        ;;
    stop)
        stop $version $account $action
        ;;
    status)
        status $version $account $action
        ;;
    restart)
        restart $version $account $action
        ;;
    *)
        help
        exit 1
        ;;
esac
exit $RETVAL
