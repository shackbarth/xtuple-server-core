#!/bin/sh

PGBIN=/usr/bin
PGHOST=localhost
#PGPORT=5433
PGUSER=admin
PGPASS=admin
#PGDB=ppctest

#NODEREDIR=8088
#NODEMAINT=451
#NODEPORT=452

checkpgport ()
{
echo "Enter Postgresql Port:"
read PGPORT

echo "Checking if that port has any databases"
DBLIST=`echo  "SELECT datname FROM pg_database ORDER BY 1;" | $PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d postgres -t`

if [ $? = 0 ]
then
echo "OK, we have some db's on there"
echo $DBLIST
else
echo "No databases, enter another PostgreSQL Port:"
checkpgport
fi
}

checkxtver ()
{
echo "Enter Database to install xTuple Mobile Extensions onto"
read PGDB
echo "Checking xTuple Version on ${PGDB}"
XTVER=`echo  "SELECT metric_value FROM metric WHERE metric_name ='ServerVersion';" | $PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -t`
if [ $? = 0 ]
then
echo "${PGDB} is xTuple Version ${XTVER}"
else
echo "${PGDB} does not appear to be an xTuple Database!"
checkxtver
fi
}

checknoderedir ()
{
echo "Enter Node Redirector (80):"
read NODEREDIR
echo "Checking if that Port is free"
NODEREDIRSTAT=`netstat -ln | grep ":${NODEREDIR} "`
if [ $? = 1 ]
then
echo "OK, that port is free"
echo "$NODEREDIR"
else
echo "Port ${NODEREDIR} is not free, choose another"
checknoderedir
fi
}

checknodemaint ()
{
echo "Enter Node Maintenance (442):"
read NODEMAINT

NODEMAINTSTAT=`netstat -ln | grep ":${NODEMAINT} "`
if [ $? = 1 ]
then
echo "OK, that port is free"
echo "$NODEMAINT"
else
echo "Port ${NODEMAINT} is not free, choose another"
checknodemaint
fi
}

checknodessl ()
{
echo "Enter Node SSL Port (443):"
read NODESSL

NODESSLSTAT=`netstat -ln | grep ":${NODESSL} "`
if [ $? = 1 ]
then
echo "OK, that port is free"
echo "You're going to use: $NODEREDIR $NODEMAINT $NODESSL"
else
echo "Port ${NODESSL} is not free, choose another"
checknodessl
fi
}

addregularuser ()
{
SALT=xTuple
echo "Enter a regular user:"
read USER
echo "Enter a password:"
read PGPASS
ENHPASS=`echo -n  ${PGPASS}${SALT}${USER} | md5sum | cut -d ' ' -f 1`
echo "You're going to use: $USER , $PGPASS, which becomes $ENHPASS"

CHKPGUSER=`echo "SELECT count(*) FROM pg_user WHERE usename = '$USER';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST postgres`
if
[ $CHKPGUSER -lt 1 ]
then
     echo  "CREATE USER \"$USER\" IN GROUP xtrole PASSWORD '$ENHPASS';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST postgres
echo "Created user."
else
     echo "Role $USER Already Exists. UPDATING..."
     echo "ALTER USER \"$USER\" PASSWORD '$ENHPASS';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST postgres
fi
}



XTPATH=/usr/local/xtuple
ENYOPATH=/usr/local/xtuple/xtuple
NODEPATH=/usr/local/xtuple/xtuple

mobilesetup()
{
cd $ENYOPATH/enyo-client/database/source
$PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -f init_instance.sql
cd $ENYOPATH/enyo-client/extensions/source/project/database/source
$PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -f init_script.sql
cd $ENYOPATH/enyo-client/extensions/source/crm/database/source
$PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -f init_script.sql
cd $ENYOPATH/enyo-client/extensions/source/sales/database/source
$PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -f init_script.sql
cd $XTPATH/private-extensions/source/incident_plus/database/source
$PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB -f init_script.sql

cd $NODEPATH/node-datasource/installer
./installer.js -h $PGHOST -p $PGPORT -u $PGUSER -d $PGDB --path ../../enyo-client/database/orm -P
./installer.js -h $PGHOST -p $PGPORT -u $PGUSER -d $PGDB --path ../../enyo-client/extensions/source/crm/database/orm -P
./installer.js -h $PGHOST -p $PGPORT -u $PGUSER -d $PGDB --path ../../enyo-client/extensions/source/project/database/orm -P
./installer.js -h $PGHOST -p $PGPORT -u $PGUSER -d $PGDB --path ../../enyo-client/extensions/source/sales/database/orm -P
./installer.js -h $PGHOST -p $PGPORT -u $PGUSER -d $PGDB --path ../../../private-extensions/source/incident_plus/database/orm -P
}

addext()
{
echo "SELECT xt.js_init(); INSERT INTO xt.usrext(usrext_usr_username, usrext_ext_id) SELECT '"$USER"',ext_id FROM xt.ext;" | $PGBIN/psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDB
}

nodeconf()
{
# Setup Private Node Instance
cat << EOF >> $NODEPATH/node-datasource/${PGDB}_${PGPORT}_${NODEREDIR}_conf.js

/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global */

(function () {
  "use strict";

  module.exports = {
    processName: "node-datasource",
    allowMultipleInstances: true,
    requireDatabase: true,
    enhancedAuthKey: "xTuple",
    datasource: {
      debugging: false,
      sessionTimeout: 60,
      requireCache: true,
      pgPoolSize: 15,
      pgWorker: false,
      bindAddress: "0.0.0.0",
      redirectPort: ${NODEREDIR},
      maintenancePort: ${NODEMAINT},
      port: ${NODESSL},
      keyFile: "./lib/private/key.pem",
      certFile: "./lib/private/server.crt",
      caFile: null,
      saltFile: "./lib/private/salt.txt",
      xTupleDbDir: "/usr/local/xtuple/databases",
      psqlPath: "psql",
      nodePath: "node",

      // These fields need to be filled in for the datasource
      // to be able to email
      smtpHost: "mercury.xtuple.com",
      smtpPort: 587,
      smtpUser: "_smtp_user_",
      smtpPassword: "_smtp_password_",

      // URL of BI server
      biUrl: "http://your.bi.solution/report.html?args=sample",

      // these properties are dynamically registered with the
      // node discovery service

      // the unique identifer registered for this service/instance
      name: "dev-datasource",

      // human-friendly description of this service
      description: "NA",

      // REQUIRED - the ip address or hostname for this instance
      hostname: "localhost",

      // human-friendly location identifier for various cloud, physical
      // servers, etc.
      location: "NA",
      databases: ["${PGDB}"],
      testDatabase: "${PGDB}"
    },
databaseServer: {
      hostname: "${PGHOST}",
      port: ${PGPORT},
      user: "${PGUSER}",
      password: "${PGPASS}"
    },
    required: [
      "lib/ext/database",
      "lib/ext/datasource",
      "lib/ext/smtpTransport",
      "lib/ext/models"
    ]
  };
}());

EOF
}

nodeserviceconf()
{
cat << EOF >> /etc/init/${PGDB}_${PGPORT}_${NODEREDIR}_service.conf
# xTuple
#
# The xTuple-node process allows mobile connections

description	"xTuple Node Server"


start on filesystem or runlevel [2345]
stop on runlevel [!2345]

respawn

chdir /usr/local/xtuple/xtuple/node-datasource
exec ./main.js -c ${PGDB}_${PGPORT}_${NODEREDIR}_conf.js > /var/log/${PGDB}_${PGDB}_${NODEREDIR}_node-datasource.log
EOF
}

startmobile()
{
service ${PGDB}_${PGPORT}_${NODEREDIR}_service start
}


livedbpermission ()
{
# Set Permissions on LiveDB
LIVEDB=$PGDB
ADMIN=$USER

echo "SELECT xt.js_init(); INSERT INTO usrpref (usrpref_name, usrpref_value, usrpref_username) (SELECT usrpref_name, usrpref_value, '"$ADMIN"' FROM usrpref WHERE usrpref_username='jsmith');" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB
echo "SELECT xt.js_init(); INSERT INTO usrpriv (usrpriv_priv_id, usrpriv_username) (SELECT usrpriv_priv_id, '"$ADMIN"' from usrpriv WHERE usrpriv_username='jsmith');" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB
# echo "UPDATE curr_symbol SET curr_base = TRUE WHERE curr_id = 1;" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB
echo "SELECT xt.js_init(); INSERT INTO emp (emp_code, emp_number, emp_username, emp_warehous_id, emp_wage, emp_extrate, emp_wage_type, emp_extrate_period, emp_wage_period) VALUES ('"$ADMIN"','"$ADMIN"', '"$ADMIN"', 35, 0, 0,'H','H','H');" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB
echo "SELECT xt.js_init(); UPDATE xt.usrinfo SET usr_active=TRUE WHERE usr_username = '"$ADMIN"';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB

# Set Permissions on DemoDB
# echo "INSERT INTO usrpref (usrpref_name, usrpref_value, usrpref_username) (SELECT usrpref_name, usrpref_value, '"$ADMIN"' FROM usrpref WHERE usrpref_username='admin');" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $DEMODB

#echo "INSERT INTO usrpriv (usrpriv_priv_id, usrpriv_username) (SELECT priv_id, '"$ADMIN"' from priv); \
#UPDATE curr_symbol SET curr_base = TRUE WHERE curr_id = 1; \
#SELECT xt.js_init();\
#INSERT INTO emp (emp_code, emp_number, emp_username, emp_warehous_id, emp_wage, emp_extrate, emp_wage_type, emp_extrate_period, emp_wage_period) VALUES ('"$ADMIN"', '"$ADMIN"', '"$ADMIN"', 35, 0, 0,'H','H','H');" \
#| $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $DEMODB

# Update Welcome Screen URL Metric Table on LIVEDB
echo "UPDATE metric SET metric_value = 'http://test.xtuple.com/welcome/?ServerVersion=4.0.4&Application=Standard&d=demo' WHERE metric_name = 'desktop/welcome';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB

# echo "UPDATE metric SET metric_value = 'http://test.xtuple.com/welcome/?ServerVersion=4.0.4&Application=Standard&d=mycompany' WHERE metric_name = 'desktop/welcome';" | $PGBIN/psql -A -t -U $PGUSER -p $PGPORT -h $PGHOST $LIVEDB

# Update Welcome Screen URL Metric Table on DEMODB
}



checkpgport
checkxtver
echo "Do you want to configure node ports and configuration files? ( Y / N )"
read YN
if [ $YN = 'Y' ]
then 
checknoderedir
checknodemaint
checknodessl
nodeconf
nodeserviceconf
echo "Done with Node Service Conf"
else
echo "Ok, Skipping"
fi

echo "Do you want to add a user to an existing database? ( Y / N )"
read YN1
if [ $YN1 = 'Y' ]
then
addregularuser
echo "Added Regular User"
else
echo "Ok, skipping adding a user"
fi

echo "Do you want to Setup Mobile Extensions? ( Y / N )"
read YN2
if [ $YN2 = 'Y' ]
then
mobilesetup
echo "Done with MobileSetup"
echo "Do you want to add extensions to users? ( Y / N )"
read YNA
if [ $YNA = 'Y' ]
then
addext
echo "Done with AddExt"
else
echo "Ok, skipping adding extensions to users"
fi
else
echo "Ok, skipping MobileSetup"
fi

livedbpermission
echo "Done with Live DB Permissions"
read dummy

startmobile

HN=`hostname`
echo "Point your browser to https://${HN}:${NODESSL} and login with $USER $PGPASS"
echo "Start and Stop Service with service ${PGDB}_${PGPORT}_${NODEREDIR}_service start"
echo "Connect with the xTuple Client Version $XTVER to $HN port $PGPORT $PGDB $USER $PGPASS"
exit 0;
 
