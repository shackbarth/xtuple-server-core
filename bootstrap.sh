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

  log "Upgrading/Removing existing packages..."

  apt-get -qq update | tee -a $logfile

  # do not run upgrade in CI environment
  if [[ -z $TRAVIS ]]; then
    apt-get -qq upgrade --force-yes | tee -a $logfile
  fi

  apt-get -qq remove postgresql-${XT_PG_VERSION}* --force-yes > /dev/null 2>&1
  apt-get -qq purge nodejs* --force-yes > /dev/null 2>&1
  apt-get -qq purge npm --force-yes > /dev/null 2>&1
  
  log "Adding Debian Repositories..."
  if [[ $version =~ '12.04' ]]; then
    apt-get -qq install python-software-properties --force-yes

    wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - > /dev/null 2>&1
    echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list 2>&1
    add-apt-repository ppa:nginx/stable -y > /dev/null 2>&1
    add-apt-repository ppa:git-core/ppa -y > /dev/null 2>&1
  fi
  
  log "Installing Debian Packages..."

  apt-get -qq update | tee -a $logfile
  apt-get -qq install curl build-essential libssl-dev openssh-server cups git-core nginx-full \
    postgresql-$XT_PG_VERSION postgresql-server-dev-$XT_PG_VERSION \
    postgresql-contrib-$XT_PG_VERSION postgresql-$XT_PG_VERSION-plv8 \
    libavahi-compat-libdnssd-dev \
    couchdb --force-yes | tee -a $logfile


  apt-get -qq autoremove --force-yes > /dev/null 2>&1
  log "All dependencies installed."
}

install_node () {
  XT_NODE_VERSION=$(curl http://semver.io/node/resolve/$XT_NODE_VERSION)
  NPM_NODE_VERSION=$(curl http://semver.io/node/stable)

  node_tarball=node-v$XT_NODE_VERSION-linux-x64.tar.gz
  npm_tarball=node-v$NPM_NODE_VERSION-linux-x64.tar.gz

  log "Installing node..."

  rm -f /usr/bin/node
  rm -f /usr/bin/npm
  rm -f /usr/local/bin/node
  rm -f /usr/local/bin/npm

  rm -rf /usr/local/node/$XT_NODE_VERSION
  mkdir -p /usr/local/node/$XT_NODE_VERSION
  mkdir -p /usr/local/node/$NPM_NODE_VERSION

  wget -q http://nodejs.org/dist/v$XT_NODE_VERSION/$node_tarball
  wget -q http://nodejs.org/dist/v$NPM_NODE_VERSION/$npm_tarball

  tar --strip-components 1 -zxf $node_tarball -C /usr/local/node/$XT_NODE_VERSION
  tar --strip-components 1 -zxf $npm_tarball -C /usr/local/node/$NPM_NODE_VERSION

  ln -s /usr/local/node/$XT_NODE_VERSION/bin/node /usr/local/bin/node
  ln -s /usr/local/node/$NPM_NODE_VERSION/bin/npm /usr/local/bin/npm 

  log "Installed node v$XT_NODE_VERSION"
  log "Installed npm v$(npm -v)"

  rm -f $node_tarball
  rm -f $npm_tarball
}

clone_installer () {
  git config --global credential.helper 'cache --timeout=3600'

  log "npm version: $(npm -v)"
  log "node version: $(node -v)"

  rm -rf /usr/local/lib/node_modules/xtuple-scripts
  mkdir -p /usr/local/xtuple/src
  cd /usr/local/xtuple/src
  rm -rf xtuple-scripts
  npm uninstall -g xtuple-scripts

  log "Downloading xTuple Server Tools...\n"
  git clone --recursive https://github.com/xtuple/xtuple-scripts.git
  cd xtuple-scripts 

  npm install --registry http://registry.npmjs.org
  npm install -g --production --registry http://registry.npmjs.org

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

log "This program will turn your server into an xTuple Server."
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
fi

log "Done! You now have yourself a bona fide xTuple Server."
rm -f bootstrap.sh
