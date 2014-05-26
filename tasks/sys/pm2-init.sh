#!/bin/bash 
# Description: xTuple Service Manager
# processname: xtuple
#
### BEGIN INIT INFO
# Provides:          xtupled
# Required-Start: $local_fs $remote_fs
# Required-Stop: $local_fs $remote_fs
# Should-Start: $network
# Should-Stop: $network
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
# Short-Description: xTuple service
# Description: xTuple Mobile Web Service Manager
### END INIT INFO

help() {
  echo -e 'xTuple Service Manager'
  echo -e ''

  if [[ $EUID -eq 0 ]]; then
    echo -e 'Usage: service xtuple {stop|restart|reload|status|help}'
    echo -e '       service xtuple <version> <name> {stop|restart|reload|status|help}'
    echo -e ''
    echo -e 'Examples:'
    echo -e '   Restart all services:        service xtuple restart'
    echo -e '   Restart a single account:    service xtuple 4.4.0 acme restart'
    echo -e '   Display status:              service xtuple status'
    echo -e ''
  else
    echo -e 'Usage: service xtuple <version> <name> {stop|restart|status|help}'
    echo -e ''
    echo -e 'xTuple Log Path: /var/log/xtuple/<version>/<name>'
    echo -e 'xTuple Config Path: /etc/xtuple/<version>/<name>'
    echo -e 'Postgres Log Path: /var/log/postgresql/'
    echo -e ''
  fi
  echo -e 'Having trouble? Email us: <dev@xtuple.com>'
  
  exit $RETVAL
}

trap help ERR SIGINT SIGTERM

export PATH=$PATH:/usr/bin:/usr/local/bin
export PM2_NODE_OPTIONS='--harmony'

VERSION="$1"
ACCOUNT="$2"
ACTION="$3"
SERVICES_FILE=

# non-root users must specify account and VERSION
if [[ $EUID -ne 0 && -z $ACCOUNT ]]; then
  help
fi

# if root does not specify account, then the first argument is the ACTION
# e.g. sudo service xtuple status, ACTION = status
if [[ -z $ACCOUNT ]]; then
  VERSION=
  ACTION="$1"
  HOME="/usr/local/xtuple"
else
  HOME=$(getent passwd "$ACCOUNT" | cut -d: -f6)
  if [[ -z $HOME ]]; then
    # looks like user doesn't exist, or at least has no homedir
    echo "User $ACCOUNT not found"
    exit 2
  fi
  SERVICES_FILE="/etc/xtuple/$VERSION/$ACCOUNT/services.json"
fi

if [[ -z $ACCOUNT && ! -z $VERSION ]]; then
  help
fi

PG_VERSION=$(psql -V | grep [[:digit:]].[[:digit:]] --only-matching)
XTUPLED="HOME=$HOME PATH=$PATH /usr/local/bin/xtupled"

#echo "$HOME"
#echo "xtupled"
#echo "$SERVICES_FILE"

xtupled() {
  eval $XTUPLED "$@"
}

start() {
  echo -e "Initializing xTuple services..."
  xtupled ping --silent &> /dev/null

  if [[ $EUID -eq 0 && -z $ACCOUNT ]]; then
    service postgresql start &> /dev/null
    #xtupled kill --silent
    xtupled resurrect --silent
  fi
  echo -e "Done."
}

stop() {
  echo -e "Stopping xTuple services... "
  xtupled ping --silent &> /dev/null

  if [[ -z $ACCOUNT ]]; then
    xtupled stop all --silent &> /dev/null
    service postgresql stop &> /dev/null
  else
    xtupled stop $SERVICES_FILE --silent &> /dev/null
    pg_ctlcluster $PG_VERSION $ACCOUNT stop -m fast &> /dev/null
  fi
  echo -e "Done."
}

restart() {
  echo -e "Restarting xTuple services..."
  xtupled ping --silent &> /dev/null

  if [[ -z $ACCOUNT ]]; then
    service postgresql restart &> /dev/null
    xtupled restart all --silent &> /dev/null
  else
    pg_ctlcluster $PG_VERSION $ACCOUNT restart -m fast &> /dev/null
    xtupled restart $SERVICES_FILE --silent &> /dev/null
  fi

  echo -e "Done."
}

reload() {
  echo -e "Reloading xTuple services..."
  xtupled ping --silent &> /dev/null

  if [[ -z $ACCOUNT ]]; then
    service postgresql reload &> /dev/null
    xtupled reload all --silent &> /dev/null
  else
    pg_ctlcluster $PG_VERSION $ACCOUNT reload &> /dev/null
    xtupled reload $SERVICES_FILE --silent &> /dev/null
  fi

  echo -e "Done."
}

status() {
  xtupled ping --silent &> /dev/null

  clusters=$(pg_lsclusters)
  services=$(xtupled status -m | sed 1d)

  if [[ -z $ACCOUNT ]]; then
    echo "$services" | sed 1d
    echo "$clusters"
  else 
    echo "$services" | grep $ACCOUNT
    echo "$clusters" | head -n 1 && echo "$clusters" | grep $ACCOUNT
  fi
}

case "$ACTION" in
  start)
      start
      ;;
  stop)
      stop
      ;;
  restart|force-reload)
      restart
      ;;
  reload)
      reload
      ;;
  status)
      status
      ;;
  *)
      help
      ;;
esac
