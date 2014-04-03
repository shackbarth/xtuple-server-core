#!/bin/bash

ROOT=$(pwd)
TRAPMSG=

xthome=/usr/local/xtuple
logfile=$ROOT/install.log
xtremote_pass=
xtversion=1.8.2
pgversion=9.1
plv8version=1.4.0
nginxversion=1.4.6
nodeversion=0.8.26

install_xtuple () {
  xtversion=$1
  shift

  xtname=$1
  shift

  argv=$@

  versiondir=$xthome/src/$xtversion
  appdir=$versiondir/xtuple

  mkdir -p $versiondir;
  cd $versiondir

  rm -rf installer xtuple-extensions private-extensions xtuple

  git config --global credential.helper 'cache --timeout=3600'

  log "Downloading installer...\n"
  git clone --recursive https://github.com/xtuple/xtuple-scripts.git installer
  cd installer
  #git checkout $tag
  sudo npm install
  cd ..

  #git clone --recursive https://github.com/xtuple/xtuple-extensions.git
  #git clone https://github.com/xtuple/private-extensions.git
  #cd private-extensions
  #npm install
  #cd ..

  #git clone --recursive https://github.com/xtuple/xtuple.git
  #cd xtuple
  #tag="v$xtversion"
  #git checkout $tag
  sudo npm install
  cd ../installer

  log "Cloned xTuple $tag."

  eval "node install.js install --xt-version $xtversion --xt-appdir $appdir --xt-name $xtname $argv"
}

install_rhel () {
  echo "TODO support rhel"
  exit 1;

  #sudo useradd -p $MAINTENANCEPASS remote
  #sudo usermod -G wheel xtremote

  #yum install postgres93-server
  #plv8 is in here: http://yum.postgresql.org/news-packagelist.php
}

install_debian () {
  log "Checking Operating System..."
  os=$(lsb_release -s -d)
  dist=$(lsb_release -s -c)
  log "   Found $os\n"
  #[[ $os =~ '12.04' ]] || die "Operating System not supported"

  log "Adding Debian Repositories..."

  sudo apt-get -qq update | tee -a $logfile
  sudo apt-get -qq autoremove --force-yes
  sudo apt-get -qq install python-software-properties --force-yes
  
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo add-apt-repository ppa:nginx/stable -y
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y
  sudo add-apt-repository ppa:chris-lea/node.js -y
  sudo add-apt-repository ppa:git-core/ppa -y
  
  log "Installing Debian Packages..."
  sudo apt-get -qq update | tee -a $logfile
  # TODO versionize postgres
  sudo apt-get -qq --force-yes install curl build-essential libssl-dev openssh-server cups ncurses-term \
    git=1:1.9.0-1~ppa0~${dist}1 \
    postgresql-9.1 postgresql-server-dev-9.1 postgresql-contrib-9.1 \
    postgresql-9.1-plv8=$plv8version.ds-2.pgdg12.4+1 \
    postgresql-9.3 postgresql-server-dev-9.3 postgresql-contrib-9.3 \
    postgresql-9.3-plv8=$plv8version.ds-2.pgdg12.4+1 \
    nginx-full=$nginxversion-1+${dist}0 \
    nodejs=$nodeversion-1chl1~${dist}1 \
    npm=1.3.0-1chl1~${dist}1 \
  | tee -a $logfile
}

log() {
  echo -e "[xtuple] $@"
  echo -e "[xtuple] $@" >> $logfile
}
die() {
  TRAPMSG="$@"
  log $@
  exit 1
}

trap 'CODE=$? ; log "\n\nxTuple Install Aborted:\n  line: $BASH_LINENO \n  cmd: $BASH_COMMAND \n  code: $CODE\n  msg: $TRAPMSG\n" ; exit 1' ERR

log "This program will install xTuple\n"
log "         xxx     xxx"
log "          xxx   xxx "
log "           xxx xxx  "
log "            xxxxx   "
log "           xxx xxx  "
log "          xxx   xxx "
log "         xxx     xxx\n"

if [[ ! -z $(which yum) ]]; then
  install_rhel
elif [[ ! -z $(which apt-get) ]]; then
  install_debian
  echo ''
else
  log "supported package manager not found"
  exit 1;
fi

install_xtuple $@
