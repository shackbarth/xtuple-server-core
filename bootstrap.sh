#!/bin/bash

logfile=$(pwd)/install.log
wd=$(pwd)

install_debian () {
  log "Checking Operating System..."
  dist=$(lsb_release -sd)
  version=$(lsb_release -sr)
  animal=$(lsb_release -sc)

  [[ $dist =~ 'Ubuntu' ]] || die "Linux distro not supported"
  [[ $version =~ '12.04' ]] || die "Ubuntu version not supported"

  log "Adding Debian Repositories..."

  sudo apt-get -qq update | tee -a $logfile
  sudo apt-get -qq autoremove --force-yes
  sudo apt-get -qq install python-software-properties --force-yes

  sudo apt-get -qq purge postgresql-${XT_PG_VERSION}* --force-yes
  sudo apt-get -qq purge nodejs-${XT_NODE_VERSION}* --force-yes
  sudo apt-get -qq purge npm* --force-yes
  
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo add-apt-repository ppa:nginx/stable -y
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y
  sudo add-apt-repository ppa:chris-lea/node.js -y
  sudo add-apt-repository ppa:git-core/ppa -y
  
  log "Installing Debian Packages..."

  sudo apt-get -qq update | tee -a $logfile
  sudo apt-get install curl build-essential libssl-dev openssh-server cups git \
    nginx-full \
    postgresql-$XT_PG_VERSION postgresql-server-dev-$XT_PG_VERSION postgresql-contrib-$XT_PG_VERSION postgresql-$XT_PG_VERSION-plv8 \
    nodejs=$XT_NODE_VERSION-1chl1~${animal}1 \
    --force-yes \
  | tee -a $logfile

  if [[ "$XT_NODE_VERSION" = "0.8.26" ]]; then
    sudo apt-get -qq install npm --force-yes
  fi

  log "All dependencies installed."
}

clone_installer () {
  git config --global credential.helper 'cache --timeout=3600'

  log "npm version: $(npm -v)"
  log "node version: $(node -v)"

  rm -rf xtuple-scripts
  rm -rf /usr/lib/node_modules/xtuple-scripts
  mkdir -p /usr/local/xtuple/src
  cd /usr/local/xtuple/src

  log "Downloading xTuple Server Tools...\n"
  git clone --recursive https://github.com/xtuple/xtuple-scripts.git
  cd xtuple-scripts 

  npm install -g --production
  npm install

  log "Running installer self-tests..."
  npm run-script test-$XT_PG_VERSION
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

trap 'CODE=$? ; log "\n\nxTuple bootstrap Aborted:\n  line: $BASH_LINENO \n  cmd: $BASH_COMMAND \n  code: $CODE\n  msg: $TRAPMSG\n" ; exit 1' ERR

if [[ -z $XT_NODE_VERSION ]]; then
  export XT_NODE_VERSION="0.8.26"
fi
if [[ -z $XT_PG_VERSION ]]; then
  export XT_PG_VERSION="9.3"
fi

log "This program will setup a new machine for xTuple."
log "Using:"
log "   postgres: $XT_PG_VERSION"
log "   nodejs:   $XT_NODE_VERSION"
log ""
log "         xxx     xxx"
log "          xxx   xxx "
log "           xxx xxx  "
log "            xxxxx   "
log "           xxx xxx  "
log "          xxx   xxx "
log "         xxx     xxx\n"

if [[ ! -z $(which apt-get) ]]; then
  install_debian
  echo ''
else
  log "apt-get not found."
  exit 1;
fi

if [[ $1 != '--no-installer' ]]; then
  clone_installer
  log "See README, and xtuple-scripts/installer.js --help"
fi

log "Done!"
