#!/bin/sh

XTUPLE_REPO='mobile-repo.xtuple.com' 
XTUPLE_INSTALL='/usr/local/xtuple'
POSTBOOKS_VERSION=4.0.3


# Setup databases.
setup_databases() {
  createuser -U postgres -rsd admin
  createuser -U postgres -RSDL xtrole 
  cd ~ 
  rm -rf demodb
  mkdir demodb
  cd ~/demodb
  
  echo "######################################################"
  echo "######################################################"
  echo "Setup databases"
  echo "######################################################"
  echo "######################################################"
  echo ""
  wget -O postbooks_demo_$POSTBOOKS_VERSION.backup http://downloads.sourceforge.net/project/postbooks/03%20PostBooks-databases/$POSTBOOKS_VERSION/postbooks_demo-$POSTBOOKS_VERSION.backup?r=http%3A%2F%2Fsourceforge.net%2Fprojects%2Fpostbooks%2Ffiles%2F03%2520PostBooks-databases%2F$POSTBOOKS_VERSION%2F&ts=1351117886&use_mirror=switch
  wait
  
  echo ""
  echo "Dropping old databases if they already exist..."
  echo ""
  dropdb -U postgres -h localhost global
  dropdb -U postgres -h localhost dev

  echo ""
  echo "Creating new databases..."
  echo ""
  createdb -U postgres -h localhost -O admin dev
  createdb -U postgres -h localhost -O admin global

  psql -U postgres -d global -p 5432 -h localhost -c "create extension plv8"
  psql -U postgres -d dev -p 5432 -h localhost -c "create extension plv8"

  pg_restore -U admin -h localhost -d dev postbooks_demo_$POSTBOOKS_VERSION.backup

  cd $XTUPLE_INSTALL/xtuple/enyo-client/database/source/
  psql -U admin -d dev -p 5432 -h localhost -f "init_instance.sql"

  cd $XTUPLE_INSTALL/xtuple/node-datasource/database/source/
  psql -U admin -d global -p 5432 -h localhost -f "init_global.sql"

  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions/source/admin/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions/source/crm/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions/source/incident_plus/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions/source/project/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions/source/sales/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"

  cd $XTUPLE_INSTALL/private-extensions/source/connect/database/source
  psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"

  echo ""
  echo "######################################################"
  echo "######################################################"
  echo "Running the ORM installer on the databases"
  echo "######################################################"
  echo "######################################################"
  echo ""
  cd $XTUPLE_INSTALL/xtuple/node-datasource/installer/
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/database/orm/
  ./installer.js -cli -h localhost -d global -u admin -p 5432 -P admin --path ../database/orm/
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/crm/database/orm
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/incident_plus/database/orm
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/project/database/orm
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/sales/database/orm
  ./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../../private-extensions/source/connect/database/orm/

  echo ""
  echo "######################################################"
  echo "######################################################"
  echo "Adding user and organization to the databases"
  echo "######################################################"
  echo "######################################################"
  echo ""
  
  psql -U admin -h localhost global -c "INSERT INTO xt.dbserver (dbserver_name, dbserver_hostname, dbserver_port, dbserver_password, dbserver_username) VALUES ('localhost', 'localhost', 5432, 'admin', 'admin');"
  psql -U admin -h localhost global -c "INSERT INTO xt.org (org_name, org_dbserver_name, org_licenses, org_active) VALUES ('dev', 'localhost', 10, True);"
  psql -U admin -h localhost global -c "INSERT INTO xt.usrorg (usrorg_usr_id, usrorg_org_name, usrorg_username) VALUES ('admin', 'dev', 'admin');"

  psql -U admin -h localhost global -c "INSERT INTO xt.ext (ext_name, ext_descrip, ext_location, ext_priv_name) VALUES ('admin', 'Administration extension', '/public-extensions', 'AccessAdminExtension');"

# add global into global for now

  psql -U admin -h localhost global -c "INSERT INTO xt.org (org_name, org_dbserver_name, org_descrip, org_cloud, org_licenses, org_active, org_group, org_dbcreated, org_dbexpire, org_cmpg_id, org_src, org_ip, org_free_trial) VALUES ('global', 'localhost', 'global', '', NULL, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL)"
  # We're using debug.js, so we don't need to insert this yet.
  #psql -U postgres -h localhost global -c "INSERT INTO xt.orgext (orgext_org_name, orgext_ext_id) SELECT 'dev', ext_id from xt.ext WHERE ext_name = 'admin';"
  # if entering this line in bash manually, remember to escape the dollar signs
  # do not escape the dollar signs if entering in a psql session
  psql -U postgres -h localhost global -c "UPDATE xt.usr SET usr_password='\$2a\$10\$5hgMfhNhQGvbRiv874rtyOieG09yYg2DQ9Ob18b2q/Tye4Fpqyav2' WHERE usr_id='admin';"

  echo ""
  echo "Databaes are now setup..."
  echo ""
  
  echo ""
  echo "######################################################"
  echo "######################################################"
  echo "You can login to the database and mobile client with:"
  echo "username: admin"
  echo "password: admin"
  echo "######################################################"
  echo "######################################################"
  echo ""
}

# Clone repos to local dev.
clone_repos() {
  cd $XTUPLE_INSTALL 
  rm -rf xtuple
  rm -rf private-extensions

  echo "######################################################"
  echo "######################################################"
  echo "Cloning repos to local development environment..."
  echo "######################################################"
  echo "######################################################"
  echo ""
  git clone git@github.com:xtuple/xtuple.git
  git clone git@github.com:xtuple/private-extensions.git
  echo ""
  echo "######################################################"
  echo "######################################################"
  echo "Configuring local repos..."
  echo "######################################################"
  echo "######################################################"
  echo ""
  cd $XTUPLE_INSTALL/xtuple
  git submodule update --init --recursive

  cd $XTUPLE_INSTALL/private-extensions
  git submodule update --init --recursive

  if [ ! -d $XTUPLE_INSTALL/xtuple/node-datasource/lib/private ]; then 
  	mkdir $XTUPLE_INSTALL/xtuple/node-datasource/lib/private
  fi

  cd $XTUPLE_INSTALL/xtuple/node-datasource/lib/private
	openssl genrsa -des3 -out server.key -passout pass:admin 1024
	openssl rsa -in server.key -passin pass:admin -out key.pem -passout pass:admin
	openssl req -batch -new -key key.pem -out server.csr
	openssl x509 -req -days 365 -in server.csr -signkey key.pem -out server.crt
 

	SALT_TXT=`date | md5sum`
  echo $SALT_TXT > $XTUPLE_INSTALL/xtuple/node-datasource/lib/private/salt.txt

  cd $XTUPLE_INSTALL/xtuple/node-datasource/
  cat sample_config.js | sed 's/bindAddress: "localhost",/bindAddress: "0.0.0.0",/' > config.js
  
  cd $XTUPLE_INSTALL/xtuple/enyo-client/extensions
  rm -f debug.js
  echo "enyo.depends(" > debug.js
  echo "  '/public-extensions/source/project/client/package.js'," >> debug.js
  echo "  '/public-extensions/source/crm/client/package.js'," >> debug.js
  echo "  '/public-extensions/source/admin/client/package.js'," >> debug.js
  echo "  '/public-extensions/source/incident_plus/client/package.js'," >> debug.js
  echo "  '/public-extensions/source/sales/client/package.js'" >> debug.js
  echo ");" >> debug.js
  
  cd $XTUPLE_INSTALL/xtuple
  npm install
  
  echo ""
  echo "repos are configured..."
  echo ""
}


apt-get -y install \
vim-nox \
python-software-properties \
git \
subversion \
pkg-config \
postgresql \
postgresql-contrib \
libpq-dev \
postgresql-server-dev-9.1 \
gyp \
build-essential \
screen \
curl 


psql -U postgres -qc 'select 1' > /dev/null 2>&1
RETVAL=$?

echo "postgres status is $RETVAL"

if [ $RETVAL -ne 0 ]; then
  echo "postgresql is not setup properly"
  exit 1
fi

LISTEN_ADDRESSES=`psql -U postgres -qtc 'show listen_addresses'`

if [ "$LISTEN_ADDRESSES" =  "local" ]; then
	echo "listen_addresses = '*'" >> /etc/postgresql/9.1/main/postgresql.conf
else
	echo 'listen addresses set correctly'
fi
CUSTOM_VARIABLE_CLASSES=`psql -U postgres -qtc 'show custom_variable_classes'`

if [ "$CUSTOM_VARIABLE_CLASSES" =  '' ]; then
	echo "custom_variable_classes = 'plv8'" >> /etc/postgresql/9.1/main/postgresql.conf
else
	echo 'plv8 setup correctly'
fi
		
# modify postgresql.conf

LISTEN_ADDRESSES=`psql -U postgres -qtc 'show listen_addresses'`

if [ "$LISTEN_ADDRESSES" =  "local" ]; then
	echo "listen_addresses = '*'" >> /etc/postgresql/9.1/main/postgresql.conf
else
	echo 'listen addresses set correctly'
fi
CUSTOM_VARIABLE_CLASSES=`psql -U postgres -qtc 'show custom_variable_classes'`

if [ "$CUSTOM_VARIABLE_CLASSES" =  '' ]; then
	echo "custom_variable_classes = 'plv8'" >> /etc/postgresql/9.1/main/postgresql.conf
else
	echo 'plv8 setup correctly'
fi
		
service postgresql restart

dpkg -s  nodejs
RETVAL=$?
echo "nodejs installed -> $RETVAL"

if [ $RETVAL -eq 1 ]; then
	
	cd /tmp
	if [ ! -f nodejs_0.8.22-1_amd64.deb ]; then 
		wget http://$XTUPLE_REPO/nodejs_0.8.22-1_amd64.deb
	fi
	dpkg -i nodejs_0.8.22-1_amd64.deb
fi

dpkg -s libv8-3.16.5 
RETVAL=$?
echo "libv8 installed -> $RETVAL"

if [ $RETVAL -eq 1 ]; then
	cd /tmp
	if [ ! -f libv8-3.16.5_3.16.5-1_amd64.deb ]; then 
		wget http://$XTUPLE_REPO/libv8-3.16.5_3.16.5-1_amd64.deb
	fi
	dpkg -i libv8-3.16.5_3.16.5-1_amd64.deb 
fi

dpkg -s postgresql-9.1-plv8
RETVAL=$?
echo "plv8 installed -> $RETVAL"

if [ $RETVAL -eq 1 ]; then
	cd /tmp
	if [ ! -f postgresql-9.1-plv8_1.4.0-1_amd64.deb ]; then 
		wget http://$XTUPLE_REPO/postgresql-9.1-plv8_1.4.0-1_amd64.deb
	fi
	dpkg -i postgresql-9.1-plv8_1.4.0-1_amd64.deb
fi

cd /usr/local
if [ ! -d xtuple ]; then
	mkdir xtuple
fi
cd xtuple
if [ ! -d xtuple ]; then
	git clone https://github.com/xtuple/xtuple
fi
cd xtuple
clone_repos
setup_databases
