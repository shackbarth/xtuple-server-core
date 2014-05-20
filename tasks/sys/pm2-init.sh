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

HOME=/usr/local/xtuple
version="$1"
USER="$2"
action="$3"

PG_VERSION=$(psql -V | grep [[:digit:]].[[:digit:]] --only-matching)
XTUPLED=/usr/local/bin/xtupled HOME=$HOME PATH=$PATH 

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
  echo -e "Stopping xTuple services... (this will drop any current sessions)"
  xtupled stop all --silent

  if [[ -z $USER ]]; then
    service postgresql stop &> /dev/null
  else
    pg_ctlcluster $PG_VERSION $USER stop -m fast &> /dev/null
  fi
  echo -e "Done."
}

restart() {
  echo -e "Restarting xTuple services... (this will drop any current sessions)"

  if [[ -z $USER ]]; then
    service postgresql restart &> /dev/null
  else
    pg_ctlcluster $PG_VERSION $USER restart -m fast &> /dev/null
  fi

  xtupled restart all --silent
  echo -e "Done."
}

reload() {
  echo -e "Reloading xTuple services..."

  if [[ -z $USER ]]; then
    service postgresql reload &> /dev/null
  else
    pg_ctlcluster $PG_VERSION $USER reload &> /dev/null
  fi

  xtupled reload all --silent
  echo -e "Done."
}

status() {
  clusters=$(pg_lsclusters)
  echo "$(xtupled list)"

  if [[ -z $USER ]]; then
    echo "$clusters"
  else 
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
    echo -e 'Examples:  '
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

if [[ $RETVAL -ne 0 ]]; then
  help
fi
