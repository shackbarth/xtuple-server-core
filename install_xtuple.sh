RUNALL=true
WORKAROUND=true

while getopts ":icbpgnh" opt; do
  case $opt in
    i)
      # Install packages
      RUNALL=
      INSTALL=true
      ;;
    c)
      # Clone repos
      RUNALL=
      CLONE=true
      ;;
    b)
      # Build v8, plv8 and nodejs
      RUNALL=
      BUILD=true
      ;;
    p)
      # Configure postgress
      RUNALL=
      POSTGRES=true
      ;;
    g)
      # Grab and install all the submodules/extensions
      RUNALL=
      GRAB=true
      ;;
    n)
      # iNitialize the databases and stuff
      RUNALL=
      INIT=true
      ;;
    W)
      # Don't use the ugly workarounds
      WORKAROUND=
      ;;
    h)
      echo "Usage: install_xtuple [OPTION]"
	 echo "Build the full xTuple Mobile Development Environment."
	 echo "This script must be run with sudo."
	 echo ""
	 echo "To install everything, just do sudo ./install_xtuple.sh"
	 echo "Everything will go in /usr/local/src/xtuple"
	 echo ""
	 echo -e "  -b\t\t"
	 echo -e "  -c\t\t"
	 echo -e "  -g\t\t"
	 echo -e "  -h\t\t"
	 echo -e "  -i\t\t"
	 echo -e "  -n\t\t"
	 echo -e "  -p\t\t"
      ;;
  esac
done

if [ $RUNALL ]
then
	INSTALL=true
	CLONE=true
	BUILD=true
	POSTGRES=true
	GRAB=true
	INIT=true
fi

if [ $CLONE ]
then
	echo "Make sure you have created a github account and have forked the xTuple repos."
	echo "Also make sure you have uploaded your ssh key to your github."
	echo "Press enter to skip and clone the xtuple repo directly."
	read -p "Github username [xtuple]: " USERNAME ERRS
fi

BASEDIR=/usr/local/src

github_ssh() {
	cd ~
	rm .ssh/id_rsa.pub
	rm .ssh/id_rsa
	
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "Creating SSH key to use for github access."
	echo "######################################################"
	echo "######################################################"
	echo ""
	read -p "Enter your github username: " USERNAME ERRS
	read -p "Enter your email address: " USEREMAIL ERRS
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "Press enter to select all the following defaults."
	echo "Make sure and leave the passphrase blank when prompted for a passphrase."
	echo "######################################################"
	echo "######################################################"
	echo ""
	ssh-keygen -t rsa -C $USEREMAIL
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "SSH key has been created. Copy and paste the key below as one line into "
	echo "your github Account Settings SSH Keys at: https://github.com/settings/ssh "
	echo "1. Go to your Account Settings"
	echo "2. Click 'SSH Keys' in the left sidebar"
	echo "3. Click 'Add SSH key'"
	echo "4. Copy and Paste your key below into the 'Key' field starting at 'ssh-rsa...' and ending with your email."
	echo "5. Click 'Add key'"
	echo "6. Confirm the action by entering your GitHub password"
	echo "######################################################"
	echo "Your SSH key is: "
	echo "######################################################"
	echo ""
	tail .ssh/id_rsa.pub
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo ""
	read -p "Press [Enter] to continue when you have finished setting up your github SSH key..."
	echo ""
}

configure_git() {
	cd ~
	rm .gitconfig

	echo "######################################################"
	echo "######################################################"
	echo "Configuring git for local development..."
	echo "######################################################"
	echo "######################################################"
	# From: https://help.github.com/articles/set-up-git
	git config --global user.name $USERNAME
	git config --global user.email $USEREMAIL
	echo ""
	echo "git is now configured..."
	echo ""
}

fork_prompt() {
	# See: https://help.github.com/articles/fork-a-repo
	echo "######################################################"
	echo "######################################################"
	echo "Fork xTuple github repos to your personal account."
	echo ""
	echo "Fork the following github repos:"
	echo "1. Login to github"
	echo "2. Visit this URL in your browser: "
	echo " - https://github.com/xtuple/xtuple"
	echo "3. Click 'Fork' in the top right corner."
	echo "4. Visit this URL in your browser: "
	echo " - https://github.com/xtuple/private-extensions"
	echo "5. Click 'Fork' in the top right corner."
	echo "######################################################"
	echo "######################################################"
	echo ""
	read -p "Press [Enter] to continue when you have finished forking the repos..."
	echo ""
}



install_packages() {
	apt-get -q update &&
	apt-get -q -y install vim git subversion build-essential postgresql-9.1 postgresql-contrib postgresql-server-dev-9.1
}

# Clone repo

clone_repo() {
	mkdir -p $BASEDIR
	if [ $? -ne 0 ]
	then
		return 1
	fi
	cd $BASEDIR

	if [ -z "$USERNAME" ]
	then
		git clone git://github.com/xtuple/xtuple.git
	else
		git clone git://github.com/$USERNAME/xtuple.git
		if [ $? -ne 0 ]
		then
			return 2
		fi
		cd xtuple
		git remote add XTUPLE git://github.com/xtuple/xtuple.git
		cd ..
	fi
	cd xtuple
	git checkout 1.3.4
	cd ..
	git clone https://github.com/xtuple/plv8.git
	git clone git://github.com/v8/v8.git
}

# Build dependencies

build_deps() {
	dpkg -l | grep nodejs > /dev/null
	if [ $? -eq 1 ]
	then
		mkdir $BASEDIR/xtuple/install
		cd $BASEDIR/xtuple/install
		if [ -f nodejs_0.8.22-1_amd64.deb ]
		then
			dpkg -i nodejs_0.8.22-1_amd64.deb
		else
			apt-get -q update
			apt-get -q -y install git cdbs curl devscripts debhelper dh-buildinfo zlib1g-dev

			git clone git://github.com/mark-webster/node-debian.git
			cd node-debian
			./build.sh clean 0.8.22
			./build.sh 0.8.22
			dpkg -i $BASEDIR/xtuple/install/node-debian/nodejs_0.8.22-1_amd64.deb
		fi
	fi
	cd $BASEDIR/v8
	git checkout 0814e98f976e8e915f5e7b4848e152ba8d4e7d95
	
	make dependencies

	make library=shared native
	cp $BASEDIR/v8/out/native/lib.target/libv8.so /usr/lib/ #root

	cd ../plv8
	make V8_SRCDIR=../v8 CPLUS_INCLUDE_PATH=../v8/include
	if [ $? -ne 0 ]
	then
		return 1
	fi
	make install
}

# Configure postgres and initialize postgres databases

setup_postgres() {
	mkdir -p $BASEDIR/postgres
	if [ $? -ne 0 ]
	then
		return 1
	fi
	
	PGDIR=/etc/postgresql/9.1/main
	mv $PGDIR/postgresql.conf $PGDIR/postgresql.conf.default
	if [ $? -ne 0 ]
	then
		return 2
	fi
	cat $PGDIR/postgresql.conf.default | sed "s/#listen_addresses = \S*/listen_addresses = \'*\'/" | sed "s/#custom_variable_classes = ''/custom_variable_classes = 'plv8'/" > $PGDIR/postgresql.conf
	mv $PGDIR/pg_hba.conf $PGDIR/pg_hba.conf.default
	cat $PGDIR/pg_hba.conf.default | sed "s/local\s*all\s*postgres.*/local\tall\tpostgres\ttrust/" | sed "s/local\s*all\s*all.*/local\tall\tall\ttrust/" | sed "s#host\s*all\s*all\s*127\.0\.0\.1.*#host\tall\tall\t127.0.0.1/32\ttrust#" > $PGDIR/pg_hba.conf

	service postgresql restart
	
	echo ""
	echo "Dropping old databases if they already exist..."
	echo ""
	dropdb -U postgres global
	dropdb -U postgres dev
	
	cd $BASEDIR/postgres
	wget http://sourceforge.net/api/file/index/project-id/196195/mtime/desc/limit/200/rss
	wait
	NEWESTVERSION=$(cat rss | grep -o /03%20PostBooks-databases/4.[0-9].[0-9]/postbooks_demo-4.[0-9].[0-9].backup/download | grep -o 4.[0-9].[0-9] | head -1)
	rm rss

	if [ -z "$NEWESTVERSION" ]
	then
		NEWESTVERSION="4.0.3"
		echo "######################################################"
		echo "Couldn't find the latest version. Using $NEWESTVERSION instead."
		echo "######################################################"
	fi

	if [ ! -f postbooks_demo-$NEWESTVERSION.backup ]
	then
		wget -O postbooks_demo-$NEWESTVERSION.backup http://sourceforge.net/projects/postbooks/files/03%20PostBooks-databases/$NEWESTVERSION/postbooks_demo-$NEWESTVERSION.backup/download
		wget -O init.sql http://sourceforge.net/projects/postbooks/files/03%20PostBooks-databases/$NEWESTVERSION/init.sql/download
		wait
		if [ ! -f postbooks_demo-$NEWESTVERSION.backup ]
		then
			echo "Failed to download files from sourceforge."
			echo "Download the postbooks demo database and init.sql from sourceforge into"
			echo "$BASEDIR/postgres then run 'install_xtuple -pn' to finish installing this package."
			return 3
		fi
	fi

	echo "######################################################"
	echo "######################################################"
	echo "Setup databases"
	echo "######################################################"
	echo "######################################################"
	echo ""

	psql -q -U postgres -f 'init.sql'

	createdb -U postgres -O admin dev
	createdb -U postgres -O admin global 

	pg_restore -U postgres -d dev postbooks_demo-$NEWESTVERSION.backup

	psql -U postgres dev -c "CREATE EXTENSION plv8"
	
	cd $BASEDIR/xtuple/enyo-client/database/source/
	psql -U admin -d dev -p 5432 -h localhost -f "init_instance.sql"

	cd $BASEDIR/xtuple/node-datasource/database/source/
	psql -U admin -d global -p 5432 -h localhost -f "init_global.sql"

	cd $BASEDIR/xtuple/enyo-client/extensions/source/admin/database/source
	psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
	cd $BASEDIR/xtuple/enyo-client/extensions/source/crm/database/source
	psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
	cd $BASEDIR/xtuple/enyo-client/extensions/source/incident_plus/database/source
	psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
	cd $BASEDIR/xtuple/enyo-client/extensions/source/project/database/source
	psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
	cd $BASEDIR/xtuple/enyo-client/extensions/source/sales/database/source
	psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"

	#cd $BASEDIR/private-extensions/source/connect/database/source
	#psql -U admin -d dev -p 5432 -h localhost -f "init_script.sql"
}

# Pull submodules

pull_modules() { 
	cd $BASEDIR/xtuple
	git submodule update --init --recursive
	if [ $? -ne 0 ]
	then
		return 1
	fi

	if [ -z $(which npm) ]
	then
		return 2
	fi
	npm install
	
	rm -f debug.js
	echo "enyo.depends(" > debug.js
	echo "  '/public-extensions/source/project/client/package.js'," >> debug.js
	echo "  '/public-extensions/source/crm/client/package.js'," >> debug.js
	echo "  '/public-extensions/source/admin/client/package.js'," >> debug.js
	echo "  '/public-extensions/source/incident_plus/client/package.js'," >> debug.js
	echo "  '/public-extensions/source/sales/client/package.js'" >> debug.js
	echo ");" >> debug.js
}

init_everythings() {
	cd $BASEDIR/xtuple/enyo-client/extensions
	./tools/buildExtensions.sh
	
	# deploy enyo client
	cd ../application
	rm -rf deploy
	cd tools
	./deploy.sh 
	
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "Running the ORM installer on the databases"
	echo "######################################################"
	echo "######################################################"
	echo ""
	
	cd $BASEDIR/xtuple/node-datasource/installer/
	./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/database/orm/
	./installer.js -cli -h localhost -d global -u admin -p 5432 -P admin --path ../database/orm/
	./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/crm/database/orm
	./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/incident_plus/database/orm
	./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/project/database/orm
	./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../enyo-client/extensions/source/sales/database/orm
	#./installer.js -cli -h localhost -d dev -u admin -p 5432 -P admin --path ../../../private-extensions/source/connect/database/orm/
	
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "Adding user and organization to the databases"
	echo "######################################################"
	echo "######################################################"
	echo ""

	psql -U postgres global -c "INSERT INTO xt.dbserver (dbserver_name, dbserver_hostname, dbserver_port, dbserver_password, dbserver_username) VALUES ('localhost', 'localhost', 5432, 'admin', 'admin');"
	psql -U postgres global -c "INSERT INTO xt.org (org_name, org_dbserver_name, org_licenses, org_active) VALUES ('dev', 'localhost', 10, True);"
	psql -U postgres global -c "INSERT INTO xt.org (org_name, org_dbserver_name, org_licenses, org_active) VALUES ('global', 'localhost', 10, True);"
	psql -U postgres global -c "INSERT INTO xt.usrorg (usrorg_usr_id, usrorg_org_name, usrorg_username) VALUES ('admin', 'dev', 'admin');"

	psql -U postgres global -c "INSERT INTO xt.ext (ext_name, ext_descrip, ext_location, ext_priv_name) VALUES ('admin', 'Administration extension', '/public-extensions', 'AccessAdminExtension');"

	psql -U postgres global -c "INSERT INTO xt.orgext (orgext_org_name, orgext_ext_id) SELECT 'dev', ext_id from xt.ext WHERE ext_name = 'admin';"
	psql -U postgres global -c "UPDATE xt.usr SET usr_password='\$2a\$10\$orE6aDt4lAOkS0eLZPer5OVCYOrVOpiRGhVa3uyueRvW4Mh4BLGeW' WHERE usr_id='admin';"

	cd $BASEDIR/xtuple/node-datasource
	cat sample_config.js | sed 's/bindAddress: "localhost",/bindAddress: "0.0.0.0",/' > config.js

	echo ""
	echo "Databaes are now setup..."
	echo ""
	
	mkdir -p $BASEDIR/xtuple/node-datasource/lib/private
	cd $BASEDIR/xtuple/node-datasource/lib/private
	cat /dev/urandom | tr -dc '0-9a-zA-Z!@#$%^&*_+-'| head -c 64 > salt.txt
	openssl genrsa -des3 -out server.key -passout pass:xtuple 1024 &&
	openssl rsa -in server.key -passin pass:xtuple -out key.pem -passout pass:xtuple &&
	openssl req -batch -new -key key.pem -out server.csr &&
	openssl x509 -req -days 365 -in server.csr -signkey key.pem -out server.crt
	if [ $? -ne 0 ]
	then
		echo ""
		echo "######################################################"
		echo "Failed to generate server certificate in $BASEDIR/xtuple/node-datasource/lib/private"
		echo "######################################################"
	fi
	
	echo ""
	echo "######################################################"
	echo "######################################################"
	echo "You can login to the database and mobile client with:"
	echo "username: admin"
	echo "password: admin"
	echo "######################################################"
	echo "######################################################"
	echo ""
	echo "Installation now finished."
	echo ""
	echo "Run the following commands to start the datasource:"
	echo ""
	echo "cd /usr/local/src/xtuple/node-datasource/"
	echo "sudo node main.js"
	echo ""
	echo "Enjoy!"
	echo ""

}

if [ $INSTALL ]
then
	install_packages
	if [ $? -ne 0 ]
	then
		exit 1
	fi
fi
if [ $CLONE ]
then
	clone_repo
	if [ $? -eq 2 ]
	then
		echo "Tried URL: git://github.com/$USERNAME/xtuple.git"
		exit 2
	fi
fi
if [ $BUILD ]
then
	build_deps
	if [ $? -ne 0 ]
	then
		echo "plv8 failed to build. Try fiddling with it manually." 1>&2
		exit 3
	fi
fi
if [ $POSTGRES ]
then
	setup_postgres
	if [ $? -ne 0 ]
	then
		exit 4
	fi
fi
if [ $GRAB ]
then
	pull_modules
	if [ $? -eq 1 ]
	then
		echo "Updating the submodules failed.  Hopefully this doesn't happen."
		exit 5
	fi
	if [ $? -eq 2 ]
	then
		echo "npm executable not found.  Check if node compiled and installed properly. Deb file should exist in /usr/local/src/node-debian"
	fi
fi
if [ $INIT ]
then
	init_everythings
	if [ $? -ne 0 ]
	then
		echo "."
	fi
fi

echo "All Done!"
