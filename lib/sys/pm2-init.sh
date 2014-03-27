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

NAME=xtuple
PM2=/usr/lib/node_modules/pm2/bin/pm2
USER=xtnode

export PATH=$PATH:/usr/bin

super() {
    sudo -u $USER PATH=$PATH $*
}

start() {
    echo "Starting $NAME"
    super $PM2 resurrect
}

stop() {
    super $PM2 dump
    super $PM2 delete all
    super $PM2 kill
}

restart() {
    echo "Restarting $NAME"
    stop
    start
}

reload() {
    echo "Reloading $NAME"
    super $PM2 reload all
}

status() {
    #echo "Status for $NAME:"
    super $PM2 list
    RETVAL=$?
}

action=$1
shift
case "$action" in
    start)
        start $@
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
    reload)
        reload
        ;;
    *)
        echo "Usage: {start|stop|status|restart|reload}"
        exit 1
        ;;
esac
exit $RETVAL
