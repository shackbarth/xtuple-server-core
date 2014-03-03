#!/bin/bash

ROOT=$(pwd)
XTHOME=/usr/local/xtuple
LOG_FILE=$XTHOME/xtuple-install.log
XTADMIN_PASS=
DBADMIN_PASS=

install_xtuple () {
  cd $XTHOME
  sudo npm install -g xtuple

  printf "\033c"
  sudo xtuple install --log-file $LOG_FILE --dbadmin-pw $DBADMIN_PASS --require-tests $@

  #git clone --recursive git://github.com/xtuple/xtuple.git
  #git checkout `git describe --abbrev=0`  # checkout latest tag
  #./script/build_app.js -i -b 
}

install_rhel () {
  echo 'TODO support rhel'
  exit 1;

  #sudo useradd -p $MAINTENANCEPASS xtadmin
  #sudo usermod -G wheel xtadmin

  #yum install postgres93-server
  #plv8 is in here: http://yum.postgresql.org/news-packagelist.php
}

install_debian () {
  log 'Installing Debian Packages...'
  echo 'deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main' | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  sudo add-apt-repository ppa:nginx/stable -y
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y
  sudo add-apt-repository ppa:chris-lea/node.js -y
  sudo apt-get -qq update 2>&1 | tee -a $LOG_FILE
  sudo apt-get -q -y install curl build-essential libssl-dev git openssh-server \
    postgresql-9.1 postgresql-server-dev-9.1 postgresql-contrib-9.1 postgresql-9.1-plv8 \
    nginx-full=1.4.5-1+precise0 \
    nodejs=0.8.26-1chl1~precise1 npm \
  2>&1 | tee -a $LOG_FILE

  log 'Creating users...'

  XTADMIN_PASS=$(head -c 8 /dev/random | base64 | sed 's/[=[:space:]]//g')
  DBADMIN_PASS=$(head -c 4 /dev/random | base64 | sed 's/[=[:space:]]//g')

  sudo addgroup xtuple
  sudo adduser xtuple  --group xtuple --home /usr/local/xtuple --system
  sudo adduser xtadmin --group xtuple --home /usr/local/xtuple
  sudo usermod xtadmin -G sudo
  sudo chown :xtuple /usr/local/xtuple
  echo $XTADMIN_PASS | sudo passwd xtadmin --stdin
  sudo su - xtadmin

  echo ''
  log 'Remote Access Credentials (ssh)'
  log '   username: xtadmin'
  log '   password: $XTADMIN_PASS'
  echo ''
  log 'WRITE THIS DOWN. You will not see information again.'
  echo ''
  log 'Press Enter to continue...'

  read
}

log() {
  echo " >> $@"
  echo $@ >> $LOG_FILE
}

printf "\033c"
echo ''
log 'Welcome to the xTuple Installer!'

if [[ ! -z $(which yum) ]]; then
  install_rhel
  install_xtuple
elif [[ ! -z $(which apt-get) ]]; then
  install_debian
  install_xtuple
else
  log 'supported package manager not found'
  exit 1;
fi
