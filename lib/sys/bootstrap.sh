#!/bin/bash

ROOT=$(pwd)
XTHOME=/usr/local/xtuple
LOG_FILE=$ROOT/xtuple-install.log
XTADMIN_PASS=
DBADMIN_PASS=
XTVERSION=
ARGV=$@
TRAPMSG=

install_xtuple () {
  XTVERSION=$1

  cd $XTHOME

  log "Backing up any existing files in installer/..."
  mkdir -p installer
  tar=$(tar cvf installer.bak.tar installer/)
  rm -rf installer

  log "Downloading installers...\n"
  clone=$(git clone --recursive https://github.com/xtuple/xtuple-scripts.git installer)
  [[ $? -ne 0 ]] && die "$clone"

  if [[ -z $XTVERSION ]]; then
    log "Downloading latest xtuple npm module..."
  else
    log "Downloading xtuple npm module v$XTVERSION..."
  fi

  #npm=$(sudo npm --loglevel error install -g xtuple@$XTVERSION)
  npm=$(sudo npm install -g xtuple@$XTVERSION)
  [[ $? -ne 0 ]] && die "$npm"

  npmxt=$(npm show xtuple version | tail -2 | head -1)

  XTVERSION="$npmxt"
  log "Downloaded: xTuple v$XTVERSION"
  #XTTAG="v$XTVERSION"
  #XTVERSION=$(git describe --abbrev=0)
  #git clone --recursive git://github.com/xtuple/xtuple.git
  #git checkout $XTVERSION

  sudo node installer/lib/sys/install.js install --xt-version $XTVERSION --log-file $LOG_FILE --dbadmin-pw $DBADMIN_PASS --require-tests $@
}

install_rhel () {
  echo "TODO support rhel"
  exit 1;

  #sudo useradd -p $MAINTENANCEPASS xtadmin
  #sudo usermod -G wheel xtadmin

  #yum install postgres93-server
  #plv8 is in here: http://yum.postgresql.org/news-packagelist.php
}

install_debian () {
  log "Checking Operating System..."
  os=$(lsb_release -s -d)
  log "   Found $os"
  [[ $os =~ '12.04' ]] || die "Operating System not supported"

  die "install_debian exiting on purpose"

  log "Installing Debian Packages..."
  echo "deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
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

  log "Creating users..."

  XTADMIN_PASS=$(head -c 8 /dev/random | base64 | sed "s/[=[:space:]]//g")
  DBADMIN_PASS=$(head -c 4 /dev/random | base64 | sed "s/[=[:space:]]//g")

  sudo addgroup xtuple
  sudo adduser xtuple  --group xtuple --home /usr/local/xtuple --system
  sudo adduser xtadmin --group xtuple --home /usr/local/xtuple
  sudo usermod xtadmin -G sudo
  sudo chown :xtuple /usr/local/xtuple
  echo $XTADMIN_PASS | sudo passwd xtadmin --stdin
  sudo su - xtadmin

  echo ""
  log "SSH Remote Access Credentials"
  log "   username: xtadmin"
  log "   password: <secure>"
  echo "[xtuple]    password: $XTADMIN_PASS"
  echo ""
  log "WRITE THIS DOWN. You will not see this information again."
  echo ""
  log "Press Enter to continue..."

  read
}

log() {
  echo -e "[xtuple] $@"
  echo -e "[xtuple] $@" >> $LOG_FILE
}
die() {
  TRAPMSG="$@"
  log $@
  exit 1
}

printf "\033c"
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
  #install_debian
  echo ''
else
  log "supported package manager not found"
  exit 1;
fi

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
