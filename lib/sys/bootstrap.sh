#!/bin/bash

ROOT=$(pwd)
ARGV=$@
TRAPMSG=

xthome=/usr/local/xtuple
logfile=$ROOT/install.log
xtremote_pass=
xt_adminpw=
xtversion=

install_xtuple () {
  xtversion=$1

  versiondir=$xthome/src/$xtversion
  mkdir -p $versiondir

  appdir=$versiondir/xtuple
  cd $versiondir
  #mkdir -p src/private-extensions
  #mkdir -p src/xtuple-extensions

  log "Backing up any existing files in installer/..."
  tar=$(tar cvf installer.bak.tar installer/ &> /dev/null)
  rm -rf installer
  rm -rf xtuple-extensions
  rm -rf private-extensions
  rm -rf xtuple

  log "Downloading installers...\n"
  clone=$(git clone --recursive https://github.com/xtuple/xtuple-scripts.git installer)
  [[ $? -ne 0 ]] && die "$clone"
  
  clone=$(git clone --recursive https://github.com/xtuple/xtuple-extensions.git)
  [[ $? -ne 0 ]] && die "$clone"

  clone=$(git clone https://github.com/xtuple/private-extensions.git)
  [[ $? -ne 0 ]] && die "$clone"

  clone=$(git clone --recursive https://github.com/xtuple/xtuple.git)
  [[ $? -ne 0 ]] && die "$clone"

  # TODO install using npm

  cd $appdir
  tag="v$xtversion"
  git checkout $tag
  sudo npm install

  log "Cloned xTuple $tag."

  cd ../installer
  #git checkout $tag
  sudo npm install
  sudo -u xtuple node lib/sys/install.js install \
    --xt-version $xtversion --xt-appdir $appdir --xt-verify \
    --xt-adminpw $xt_adminpw "$@"
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
  log "   Found $os"
  [[ $os =~ '12.04' ]] || die "Operating System not supported"

  log "Adding Debian Repositories..."
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list &> /dev/null
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add - &> /dev/null
  sudo apt-get -qq update 2>&1 | tee -a $logfile
  sudo apt-get -qq install python-software-properties
  sudo add-apt-repository ppa:nginx/stable -y 2>&1 /dev/null
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y &> /dev/null
  sudo add-apt-repository ppa:chris-lea/node.js -y
  log "Installing Debian Packages..."
  sudo apt-get -qq update 2>&1 | tee -a $logfile
  # TODO versionize postgres
  sudo apt-get -qq install curl build-essential libssl-dev git openssh-server cups \
    postgresql-9.1 postgresql-server-dev-9.1 postgresql-contrib-9.1 \
    postgresql-9.1-plv8=1.4.0.ds-2.pgdg12.4+1 \
    nginx-full=1.4.5-1+precise0 \
    nodejs=0.8.26-1chl1~precise1 npm \
  2>&1 | tee -a $logfile

  log "Creating users..."

  xtremote_pass=$(head -c 8 /dev/urandom | base64 | sed "s/[=\s]//g")
  xt_adminpw=$(head -c 4 /dev/urandom | base64 | sed "s/[=\s]//g")

  sudo addgroup xtuple
  sudo adduser xtuple  --system --home /usr/local/xtuple
  sudo adduser xtuple xtuple
  sudo useradd -p $xtremote_pass xtremote -d /usr/local/xtuple
  sudo usermod -a -G xtuple,www-data,postgres xtremote
  sudo chown :xtuple /usr/local/xtuple
}

setup_policy () {
  echo ""
  log "SSH Remote Access Credentials"
  log "   username: xtremote"
  log "   password: <hidden>"
  echo "[xtuple]    password: $xtremote_pass"
  echo ""
  log "WRITE THIS DOWN. This information is about to be destroyed forever."
  log "You have been warned."
  echo ""
  log "Press Enter to continue installation..."

  read
  printf "\033c"
  xtremote_pass=

  # TODO remove root from sshd config
  # TODO set root shell to limbo
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

trap 'CODE=$? ; log "\n\nxTuple Install Aborted:\n  line: $BASH_LINENO \n  cmd: $BASH_COMMAND \n  code: $CODE\n  msg: $TRAPMSG\n" ; exit 1' ERR EXIT

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

setup_policy

# arguments are passed through to the myriad downstream install scripts;
# we only specifically care about xt-version right now
for arg in "$@"
do
  case "$arg" in
    --xt-version)
      install_xtuple $2 ;;
    *)
      shift ;;
  esac
done
install_xtuple
