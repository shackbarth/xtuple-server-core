#!/bin/bash

DOWNLOAD=http://monitor.xtuple.com/download/
RUN_DIR=$(pwd)
BASE_DIR=/usr/local/src
CONFIG_DIR=/etc/xtuple
DATABASE=dev
XT_DIR=/usr/local/xtuple
LOG_FILE=$RUN_DIR/install.log
mv $LOG_FILE $LOG_FILE.old

log() {
        echo $@
        echo $@ >> $LOG_FILE
}

varlog() {
        log $(eval "echo $1 = \$$1")
}

cdir() {
        cd $1
        log "Changing directory to $1"
}

init_everything() {

        log ""
        log "######################################################"
        log "######################################################"
        log "Setting properties of admin user"
        log "######################################################"
        log "######################################################"
        log ""


        cdir $XT_DIR/xtuple/node-datasource

        cat sample_config.js | sed 's/bindAddress: "localhost",/bindAddress: "0.0.0.0",/' | sed "s/testDatabase: \"\"/testDatabase: '$DATABASE'/" | sed 's/\.\/lib/\/etc\/xtuple\/lib/' > $CONFIG_DIR/config.js
        echo "Configured node-datasource"

        echo ""
        log "The database is now set up..."
        log ""

        mkdir -p $CONFIG_DIR/lib/private
        cdir $CONFIG_DIR/lib/private
        cat /dev/urandom | tr -dc '0-9a-zA-Z!@#$%^&*_+-'| head -c 64 > salt.txt
        log "Created salt"
        openssl genrsa -des3 -out server.key -passout pass:xtuple 1024 2>&1 | tee -a $LOG_FILE
        openssl rsa -in server.key -passin pass:xtuple -out key.pem -passout pass:xtuple 2>&1 | tee -a $LOG_FILE
        openssl req -batch -new -key key.pem -out server.csr -subj '/CN='$(hostname) 2>&1 | tee -a $LOG_FILE
        openssl x509 -req -days 365 -in server.csr -signkey key.pem -out server.crt 2>&1 | tee -a $LOG_FILE
        if [ $? -ne 0 ]
        then
                log ""
                log "######################################################"
                log "Failed to generate server certificate in $CONFIG_DIR/lib/private"
                log "######################################################"
                return 3
        fi

        cdir $XT_DIR/xtuple
        node scripts/build_app.js -c /etc/xtuple/config.js -d $DATABASE 2>&1 | tee -a $LOG_FILE

	log "setup admin user"
        psql -U admin $DATABASE -c "select xt.js_init(); insert into xt.usrext (usrext_usr_username, usrext_ext_id) select 'admin', ext_id from xt.ext where ext_location = '/core-extensions';" 2>&1 | tee -a $LOG_FILE
	log "add permissions"

	psql -U admin $DATABASE -c "select xt.js_init(); INSERT INTO xt.usrext(usrext_usr_username, usrext_ext_id) select 'admin', ext_id from xt.ext WHERE ext_id NOT IN (SELECT usrext_ext_id FROM xt.usrext WHERE usrext_usr_username='admin')" 2>&1 | tee -a $LOG_FILE
        log ""
        log "######################################################"
        log "######################################################"
        log "You can login to the database and mobile client with:"
        log "username: admin"
        log "password: admin"
        log "######################################################"
        log "######################################################"
        log ""
        log "Installation now finished."
        log ""
        log ""
        log "Run the following commands to start the datasource:"
        log ""
        if [ $USERNAME ]
        then
                log "cd ~/xtuple/node-datasource"
                log "sudo node main.js"
        else
                log "cd /usr/local/src/xtuple/node-datasource/"
                log "sudo node main.js"
        fi
}
pull_modules() {
        cdir $XT_DIR/xtuple
        git submodule update --init --recursive 2>&1 | tee -a $LOG_FILE
        if [ $? -ne 0 ]
        then
                return 1
        fi

        if [ -z $(which npm) ]
        then
                log "Couldn't find npm"
                return 2
        fi
        npm install 2>&1 | tee -a $LOG_FILE
        npm install -g mocha 2>&1 | tee -a $LOG_FILE

    cdir test/shared
    rm -f login_data.js
    echo "exports.data = {" >> login_data.js
    echo "  webaddress: ''," >> login_data.js
    echo "  username: 'admin', //------- Enter the xTuple username" >> login_data.js
    echo "  pwd: 'admin', //------ enter the password here" >> login_data.js
    echo "  org: '$DATABASE', //------ enter the database name here" >> login_data.js
    echo "  suname: '', //-------enter the sauce labs username" >> login_data.js
    echo "  sakey: '' //------enter the sauce labs access key" >> login_data.js
    echo "}" >> login_data.js
        log "Created testing login_data.js"

}

setup_postgres() {
	pg_createcluster 9.1 main
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
        chown postgres $PGDIR/postgresql.conf
        mv $PGDIR/pg_hba.conf $PGDIR/pg_hba.conf.default
        cat $PGDIR/pg_hba.conf.default | sed "s/local\s*all\s*postgres.*/local\tall\tpostgres\ttrust/" | sed "s/local\s*all\s*all.*/local\tall\tall\ttrust/" | sed "s#host\s*all\s*all\s*127\.0\.0\.1.*#host\tall\tall\t127.0.0.1/32\ttrust#" > $PGDIR/pg_hba.conf
        chown postgres $PGDIR/pg_hba.conf

        service postgresql restart

        log ""
        log "Dropping old databases if they already exist..."
        log ""
        dropdb -U postgres $DATABASE 

        cdir $BASEDIR/postgres
        wget http://sourceforge.net/api/file/index/project-id/196195/mtime/desc/limit/200/rss
        wait
  NEWESTVERSION=`cat rss | grep -o '03%20PostBooks-databases\/4.[0-9].[0-9]\(RC\)\?\/postbooks_demo-4.[0-9].[0-9]\(RC\)\?.backup\/download' | grep -o '4.[0-9].[0-9]\(RC\)\?' | head -1`
        rm rss

        if [ -z "$NEWESTVERSION" ]
        then
                NEWESTVERSION="4.0.3"
                log "######################################################"
                log "Couldn't find the latest version. Using $NEWESTVERSION instead."
                log "######################################################"
        fi
       if [ ! -f postbooks_demo-$NEWESTVERSION.backup ]
        then
                wget -O postbooks_demo-$NEWESTVERSION.backup http://sourceforge.net/projects/postbooks/files/03%20PostBooks-databases/$NEWESTVERSION/postbooks_demo-$NEWESTVERSION.backup/download
                wget -O init.sql http://sourceforge.net/projects/postbooks/files/03%20PostBooks-databases/$NEWESTVERSION/init.sql/download
                wait
                if [ ! -f postbooks_demo-$NEWESTVERSION.backup ]
                then
                        log "Failed to download files from sourceforge."
                        log "Download the postbooks demo database and init.sql from sourceforge into"
                        log "$BASEDIR/postgres then run 'install_xtuple -pn' to finish installing this package."
                        return 3
                fi
        fi

        log "######################################################"
        log "######################################################"
        log "Setup database"
        log "######################################################"
        log "######################################################"
        log ""

        psql -q -U postgres -f 'init.sql' 2>&1 | tee -a $LOG_FILE

        createdb -U postgres -O admin $DATABASE  2>&1 | tee -a $LOG_FILE

        pg_restore -U postgres -d $DATABASE postbooks_demo-$NEWESTVERSION.backup 2>&1 | tee -a $LOG_FILE


        psql -U postgres $DATABASE -c "CREATE EXTENSION plv8" 2>&1 | tee -a $LOG_FILE
	
}


wget ${DOWNLOAD}nodejs_0.8.22-1_amd64.deb
wget ${DOWNLOAD}libv8-3.16.5_3.16.5-1_amd64.deb
wget ${DOWNLOAD}postgresql-9.1-plv8_1.4.0-1_amd64.deb
dpkg -i *.deb
rm *.deb
apt-get update
apt-get -q -y install vim git  build-essential postgresql-9.1 postgresql-contrib postgresql-server-dev-9.1
mkdir $CONFIG_DIR
mkdir $XT_DIR
cd $XT_DIR

git clone https://github.com/xtuple/xtuple.git
pull_modules
setup_postgres
init_everything
