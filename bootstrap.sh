#!/bin/bash

logfile=$(pwd)/install.log

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
  
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo add-apt-repository ppa:nginx/stable -y
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y
  sudo add-apt-repository ppa:chris-lea/node.js -y
  sudo add-apt-repository ppa:git-core/ppa -y
  
  log "Installing Debian Packages..."

  sudo apt-get -qq update | tee -a $logfile
  sudo apt-get --force-yes install curl build-essential libssl-dev openssh-server cups git \
    nginx-full \
    postgresql-9.1 postgresql-server-dev-9.1 postgresql-contrib-9.1 postgresql-9.1-plv8 \
    postgresql-9.3 postgresql-server-dev-9.3 postgresql-contrib-9.3 postgresql-9.3-plv8 \
    nodejs=$XT_NODE_VERSION-1chl1~${animal}1 \
  | tee -a $logfile

  if [[ "$XT_NODE_VERSION" -eq "0.8.26" ]]; then
    sudo apt-get -qq --force-yes install npm
  fi

  log "All dependencies installed."
}

clone_installer () {
  git config --global credential.helper 'cache --timeout=3600'

  log "npm version: $(npm -v)"
  log "node version: $(node -v)"

  rm -rf xtuple-scripts
  rm -rf /usr/lib/node_modules/xtuple-scripts
  log "Downloading installer...\n"
  git clone --recursive https://github.com/xtuple/xtuple-scripts.git
  cd xtuple-scripts 

  npm install -g --production
  npm install

  log "Running installer self-tests..."
  npm test
  rm node_modules
  cd ..
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

log "This program will setup a new machine for xTuple."
log "Running this program on a non-dedicated machine is NOT RECOMMENDED\n"
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
