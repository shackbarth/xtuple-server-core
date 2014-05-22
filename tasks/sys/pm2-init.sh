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

trap help ERR SIGINT SIGTERM

export PATH=$PATH:/usr/bin:/usr/local/bin
export PM2_NODE_OPTIONS='--harmony'

version="$1"
USER="$2"
action="$3"

PG_VERSION=$(psql -V | grep [[:digit:]].[[:digit:]] --only-matching)
XTUPLED=/usr/local/bin/xtupled HOME=$HOME PATH=$PATH 
SERVICES_FILE=

# non-root users must specify account and version
if [[ $EUID -ne 0 && -z $USER ]]; then
  help
fi

# if root does not specify account, then the first argument is the action
# e.g. sudo service xtuple status, action = status
if [[ -z $USER ]]; then
  version=
  action="$1"
  USER="root"
  export HOME=/usr/local/xtuple
else
  export HOME=$(eval echo ~$USER)
  SERVICES_FILE=/etc/xtuple/$version/$USER/services.json
fi

if [[ -z $USER && ! -z $version ]]; then
  help
fi

xtupled() {
  set -e
  $XTUPLED "$@"
  set +e
}

start() {
  if [[ $(id -u) -eq 0 && -z $USER ]]; then

    service postgresql start &> /dev/null

    if [[ $(xtupled ping) =~ "pong" ]]; then
      echo -e "xtupled is Already Initialized."
    else
      echo -e "Initializing xTuple services..."

      #xtupled kill --silent
      xtupled resurrect --silent

      echo -e "Done."
    fi
  else
    help
  fi
}

stop() {
  echo -e "Stopping xTuple services... (this will drop any user sessions)"

  if [[ -z $USER ]]; then
    xtupled stop all --silent
    service postgresql stop &> /dev/null
  else
    xtupled stop $SERVICES_FILE --silent
    pg_ctlcluster $PG_VERSION $USER stop -m fast &> /dev/null
  fi
  echo -e "Done."
}

restart() {
  echo -e "Restarting xTuple services... (this will drop any user sessions)"

  if [[ -z $USER ]]; then
    service postgresql restart &> /dev/null
    xtupled restart all --silent
  else
    pg_ctlcluster $PG_VERSION $USER restart -m fast &> /dev/null
    xtupled restart $SERVICES_FILE --silent
  fi

  echo -e "Done."
}

reload() {
  echo -e "Reloading xTuple services..."

  if [[ -z $USER ]]; then
    service postgresql reload &> /dev/null
    xtupled reload all --silent
  else
    pg_ctlcluster $PG_VERSION $USER reload &> /dev/null
    xtupled reload $SERVICES_FILE --silent
  fi

  echo -e "Done."
}

status() {
  clusters=$(pg_lsclusters)
  services=$($XTUPLED status -m)

  if [[ -z $USER ]]; then
    echo "$services"
    echo "$clusters"
  else 
    echo "$services" | head -n 1 && echo "$services" | grep $USER
    echo "$clusters" | head -n 1 && echo "$clusters" | grep $USER
  fi
}
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

# explicitly (re)-permission root process file so that users can not see the
# global process list even if something else accidentally slackens the rules
if [[ $EUID -eq 0 ]]; then
  mkdir -p /usr/local/xtuple/.pm2
  chown -R root:xtadmin /usr/local/xtuple/.pm2
  chmod -R o-rw /usr/local/xtuple/.pm2
fi

case "$action" in
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
