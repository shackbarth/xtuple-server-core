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
# Short-Description: xTuple service
# Description: xTuple Mobile Web Service Manager
### END INIT INFO

trap help ERR SIGINT SIGTERM

PM2=$(which pm2)
PG_VERSION=$(psql -V | grep [[:digit:]].[[:digit:]] --only-matching)
HOME=

super() {
  set -e
  if [[ -z $account ]]; then
    sudo -Ei HOME=$HOME PATH=$PATH $PM2 ping &> /dev/null
    sudo -Ei HOME=$HOME PATH=$PATH $PM2 dump &> /dev/null
    sudo -Ei HOME=$HOME PATH=$PATH $*
  else
    sudo -Ei -u $account USER=$account HOME=$HOME PATH=$PATH $PM2 -u $account ping &> /dev/null
    if [[ $EUID -eq 0 ]]; then
      sudo -Ei HOME=/usr/local/xtuple PATH=$PATH $PM2 -u $account dump &> /dev/null
    fi
    sudo -Ei -u $account USER=$account HOME=$HOME PATH=$PATH $PM2 -u $account dump &> /dev/null
    sudo -Ei -u $account USER=$account HOME=$HOME PATH=$PATH $*
  fi
  RETVAL=$?
  set +e
}

start() {
  sudo touch /home/vagrant/hello
  
  #$EUID -eq 0 && -z $account ]]; then

  if [[ $(logname) = "root" && -z $account ]]; then
    echo -e "Initializing xTuple services..."

    sudo service postgresql start &> /dev/null
    sudo -E HOME=/usr/local/xtuple PATH=$PATH $PM2 resurrect &> /dev/null
  else
    help
  fi
}

stop() {
  echo -e "Stopping xTuple services..."
  super $PM2 stop all &> /dev/null

  if [[ -z $account ]]; then
    super service postgresql stop &> /dev/null
  else
    super pg_ctlcluster $PG_VERSION $account stop -m fast &> /dev/null
  fi
  echo -e "Done."
}

restart() {
  echo -e "Restarting xTuple services..."

  if [[ -z $account ]]; then
    super service postgresql restart &> /dev/null
  else
    super pg_ctlcluster $PG_VERSION $account restart -m fast &> /dev/null
  fi

  super $PM2 restart all &> /dev/null
}

reload() {
  echo -e "Reloading xTuple services..."

  if [[ -z $account ]]; then
    super service postgresql reload &> /dev/null
  else
    super pg_ctlcluster $PG_VERSION $account reload &> /dev/null
  fi

  super $PM2 reload all &> /dev/null
}

status() {
  clusters=$(super pg_lsclusters)
  echo "$(super $PM2 list | sed 1d)"

  if [[ -z $account ]]; then
    echo "$clusters"
  else 
    #echo "$list" | head -n 3 && echo "$list" | grep $account -A 1
    echo "$clusters" | head -n 1 && echo "$clusters" | grep $account
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

version="$1"
account="$2"
action="$3"

export PATH=$PATH:/usr/bin
export PM2_NODE_OPTIONS='--harmony'

# non-root users must specify account and version
if [[ $EUID -ne 0 && -z $account ]]; then
  help
fi

# if root does not specify account, then the first argument is the action
# e.g. sudo service xtuple status, action = status
if [[ -z $account ]]; then
  version=
  action="$1"
  HOME=/usr/local/xtuple

# set home directory to user's home dir if $account is set, regardless of root
else
  HOME=/usr/local/$account
fi

if [[ -z $account && ! -z $version ]]; then
  help
fi

# explicitly (re)-permission root process file so that users can not see the
# global process list even if something else accidentally slackens the rules
if [[ $EUID -eq 0 ]]; then
  mkdir -p /usr/local/xtuple/.pm2
  chown -R root:xtadmin /usr/local/xtuple/.pm2
  chmod -R o-rwx /usr/local/xtuple/.pm2
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
