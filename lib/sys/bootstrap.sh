#!/bin/bash

ROOT=$(pwd)
ARGV=$@
TRAPMSG=

xthome=/usr/local/xtuple
logfile=$ROOT/install.log
xtremote_pass=
pg_adminpw=
xtversion=

install_xtuple () {
  xtversion=$1

  versiondir=$xthome/src/$xtversion
  mkdir -p $versiondir

  srcdir=$versiondir/xtuple
  cd $versiondir
  #mkdir -p src/private-extensions
  #mkdir -p src/xtuple-extensions

  log "Backing up any existing files in installer/..."
  tar=$(tar cvf installer.bak.tar installer/)
  rm -rf installer

  log "Downloading installers...\n"
  clone=$(git clone --recursive https://github.com/xtuple/xtuple-scripts.git installer)
  [[ $? -ne 0 ]] && die "$clone"
  
  clone=$(git clone --recursive https://github.com/xtuple/xtuple-extensions)
  [[ $? -ne 0 ]] && die "$clone"

  clone=$(git clone --recursive https://github.com/xtuple/private-extensions)
  [[ $? -ne 0 ]] && die "$clone"

  clone=$(git clone --recursive git://github.com/xtuple/xtuple.git)
  [[ $? -ne 0 ]] && die "$clone"

  # TODO install using npm

  cd src/xtuple
  tag="v$xtversion"
  git fetch $tag
  git checkout $tag
  npm install

  log "Cloned xTuple $tag."

  printf "\033c"
  cd installer
  git fetch $tag
  git checkout $tag
  npm install
  sudo node lib/sys/install.js install \
    --xt-version $xtversion --xt-srcdir $xthome/src/$xtversion/xtuple --xt-verify \
    --pg-adminpw $pg_adminpw $@
}

install_rhel () {
  echo "TODO support rhel"
  exit 1;

  #sudo useradd -p $MAINTENANCEPASS xtremote
  #sudo usermod -G wheel xtremote

  #yum install postgres93-server
  #plv8 is in here: http://yum.postgresql.org/news-packagelist.php
}

install_debian () {
  log "Checking Operating System..."
  os=$(lsb_release -s -d)
  log "   Found $os"
  [[ $os =~ '12.04' ]] || die "Operating System not supported"

  log "Installing Debian Packages..."
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
  sudo wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
  sudo apt-get -qq update 2>&1 | tee -a $logfile
  sudo apt-get -q -y install python-software-properties
  sudo add-apt-repository ppa:nginx/stable -y
  sudo add-apt-repository ppa:chris-lea/node.js-legacy -y
  sudo add-apt-repository ppa:chris-lea/node.js -y
  sudo apt-get -qq update 2>&1 | tee -a $logfile
  sudo apt-get -q -y install curl build-essential libssl-dev git openssh-server \
    postgresql-9.1 postgresql-server-dev-9.1 postgresql-contrib-9.1 postgresql-9.1-plv8 \
    nginx-full=1.4.5-1+precise0 \
    nodejs=0.8.26-1chl1~precise1 npm \
  2>&1 | tee -a $logfile

  log "Creating users..."

  xtremote_pass=$(head -c 8 /dev/urandom | base64 | sed "s/[=[:space:]]//g")
  pg_adminpw=$(head -c 4 /dev/urandom | base64 | sed "s/[=[:space:]]//g")

  sudo addgroup xtuple
  sudo adduser xtuple  --group xtuple --home /usr/local/xtuple --system
  sudo adduser xtremote --group xtuple --home /usr/local/xtuple
  sudo usermod xtremote -G sudo
  sudo chown :xtuple /usr/local/xtuple
  echo $xtremote_pass | sudo passwd xtremote --stdin
  sudo su - xtremote

}

setup_policy () {
  echo ""
  log "SSH Remote Access Credentials"
  log "   username: xtremote"
  log "   password: <hidden>"
  echo "[xtuple]    password: $xtremote_pass"
  echo ""
  log "WRITE THIS DOWN. This information is about to be destroyed forever."
  echo ""
  log "Press Enter to continue installation..."

  read

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
log "         xxx     xxx"

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
