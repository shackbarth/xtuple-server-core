#!/bin/bash

logfile=$(pwd)/install.log
wd=$(pwd)

install_debian () {
  log "Checking Operating System..."
  dist=$(lsb_release -sd)
  version=$(lsb_release -sr)
  animal=$(lsb_release -sc)

  [[ $dist =~ 'Ubuntu' ]] || die "Linux distro not supported"
  [[ $version =~ '12.04' || $version =~ '14.04' ]] || die "Ubuntu version not supported"

  log "Adding Debian Repositories..."

  apt-get -qq update | tee -a $logfile
  apt-get -qq autoremove --force-yes
  apt-get -qq install python-software-properties --force-yes

  apt-get -qq purge postgresql-${XT_PG_VERSION}* --force-yes 2>&1
  apt-get -qq purge nodejs-${XT_NODE_VERSION}* --force-yes 2>&1
  apt-get -qq purge npm* --force-yes 2>&1
  
  wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - 2>&1
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list 2>&1
  add-apt-repository ppa:nginx/stable -y 2>&1
  add-apt-repository ppa:git-core/ppa -y 2>&1
  
  log "Installing Debian Packages..."

  apt-get -qq update | tee -a $logfile
  apt-get -qq install curl build-essential openssl libssl-dev libv8-dev openssh-server cups git-core nginx-full --force-yes | tee -a $logfile
  apt-get -qq install postgresql-$XT_PG_VERSION postgresql-server-dev-$XT_PG_VERSION --force-yes | tee -a $logfile
  apt-get -qq install postgresql-contrib-$XT_PG_VERSION postgresql-$XT_PG_VERSION-plv8 --force-yes | tee -a $logfile

  log "All dependencies installed."
}

install_node () {
  NPM_NODE_VERSION=$(curl http://semver.io/node/stable)
  
  #if [[ ! -z $(npm -v) ]]; then
    #log "Node already installed: $(node -v)"
    #return
  #fi

  node_tarball=node-v$XT_NODE_VERSION-linux-x64.tar.gz
  npm_tarball=node-v$NPM_NODE_VERSION-linux-x64.tar.gz

  rm -f /usr/bin/node
  rm -f /usr/bin/npm

  mkdir -p /usr/local/node/$XT_NODE_VERSION
  mkdir -p /usr/local/node/$NPM_NODE_VERSION

  wget http://nodejs.org/dist/v$NPM_NODE_VERSION/node-v$NPM_NODE_VERSION-linux-x64.tar.gz
  wget http://nodejs.org/dist/v$XT_NODE_VERSION/node-v$XT_NODE_VERSION-linux-x64.tar.gz
  tar --strip-components 1 -zxf $node_tarball -C /usr/local/node/$XT_NODE_VERSION
  tar --strip-components 1 -zxf $npm_tarball -C /usr/local/node/$NPM_NODE_VERSION

  ln -s /usr/local/node/$XT_NODE_VERSION/bin/node /usr/bin/node
  ln -s /usr/local/node/$NPM_NODE_VERSION/bin/npm /usr/bin/npm 
}

clone_installer () {
  git config --global credential.helper 'cache --timeout=3600'

  log "npm version: $(npm -v)"
  log "node version: $(node -v)"

  rm -rf /usr/lib/node_modules/xtuple-scripts
  mkdir -p /usr/local/xtuple/src
  cd /usr/local/xtuple/src
  rm -rf xtuple-scripts
  npm uninstall -g xtuple-scripts

  log "Downloading xTuple Server Tools...\n"
  git clone --recursive https://github.com/xtuple/xtuple-scripts.git
  cd xtuple-scripts 

  npm install --registry http://registry.npmjs.org
  npm install -g --production http://registry.npmjs.org

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
  install_node
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
