#!/bin/bash
# sh ./MakeNew.sh customer/clustername 10080 10443 databasename user password

# What this does:
# Setups up configs and entries for:
# Nginx, xTuple Mobile, Upstart, and PGBouncer, all from one command.

# Todo: Check monitor.xtuple.com database for port overlap - possibly read that db and assign something not taken. :)
# Trigger on Ports column? Autoincrement? That'd be nice.


CUSTOMER=$1
NODEREDIRECTPORT=$2
NODEPORT=$3
DBNAME=$4
USER=$5
PASS=$6

# Port 10023 10.0.1.125
# Port 10024 10.0.1.239
WORKDATE=`/bin/date "+%m%d%Y"`

XTHOME=/etc/xtuple/
XTCODE=/usr/local/current
BOUNCERINI=/etc/pgbouncer/pgbouncer.ini
LOG="${CUSTOMER}_${WORKDATE}.log"

checkconfigdir()
{
if [ ! -d "${XTHOME}/${CUSTOMER}" ];
then
echo "Creating Directory with mkdir -p ${XTHOME}/${CUSTOMER}"
mkdir -p ${XTHOME}/${CUSTOMER}
echo "Copying $XTCODE/node-datasource/lib to ${XTHOME}/${CUSTOMER}"
cp -R ${XTHOME}/lib_template ${XTHOME}/${CUSTOMER}/lib
echo "done"
else
echo "Path ${XTHOME}/${CUSTOMER} already Exists!"
fi
}

writeconfigjs()
{
if [ ! -f "${XTHOME}/${CUSTOMER}/${CUSTOMER}.js" ];
then
cat << EOF >> ${XTHOME}/${CUSTOMER}/${CUSTOMER}.js
/*jshint node:true, indent:2, curly:false, eqeqeq:true, immed:true, latedef:true, newcap:true, noarg:true,
regexp:true, undef:true, strict:true, trailing:true, white:true */
/*global */

(function () {
  "use strict";

  module.exports = {
    processName: "node-datasource",
    allowMultipleInstances: true,
    datasource: {
      debugging: false,
      debugDatabase: false,
      enhancedAuthKey: "j3H44uadEI#8#kSmkh#H%JSLAKDOHImklhdfsn3#432?%^kjasdjla3uy989apa3uipoweurw-03235##+=-lhkhdNOHA?%@mxncvbwoiwerNKLJHwe278NH28shNeGc",
      sessionTimeout: 60,
      requireCache: true,
      pgPoolSize: 1,
      pgWorker: false,
      bindAddress: "localhost",
      redirectPort: ${NODEREDIRECTPORT},
      maintenancePort: 10442,
      proxyPort: 443,
      port: ${NODEPORT},
      keyFile: "/etc/xtuple/lib/private/mobile.xtuple.com.key.stripped",

      certFile: "/etc/xtuple/lib/private/mobile.xtuple.com.crt",
      caFile: [
        "/etc/xtuple/lib/private/SSL123_PrimaryCA.pem",
        "/etc/xtuple/lib/private/SSL123_SecondaryCA.pem"
      ],
      saltFile: "/etc/xtuple/lib/private/salt.txt",
      biKeyFile: "",
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
      // Leave this empty unless reports are installed
      biUrl: "", // "http://yourserver.com:8080/pentaho/content/reporting/reportviewer/report.html?",
      biServerUrl: "", // "http://yourserver.com:8080/pentaho/"

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
      // Add each database to the array.
      databases: ["${DBNAME}"],
      testDatabase: "" // this must remain empty for production datasources
    },
    extensionRoutes: [],
    databaseServer: {
      hostname: "localhost",
      port: 6432,
      user: "${USER}",
      password: "${PASS}"
    }
  };
}());
EOF

else
echo "Config.js named ${CUSTOMER}.js already exists! Skipping."

fi
}

writenodeservice()
{
cat << EOF >> /etc/init/${CUSTOMER}_mobile.conf
# xTuple
#
# The xTuple-node process allows mobile connections

description     "xTuple Node Server for ${CUSTOMER}"

start on filesystem or runlevel [2345]
stop on runlevel [!2345]

console output

respawn

chdir /usr/local/current/xtuple/node-datasource
exec ./main.js -c /etc/xtuple/${CUSTOMER}/${CUSTOMER}.js > /var/log/${CUSTOMER}_mobile.log
EOF
}

chknodeservice()
{
if [ ! -f /etc/init/${CUSTOMER}_mobile.conf ];
then
echo "${CUSTOMER}_mobile.conf does not exist. Creating."
writenodeservice
else
echo "${CUSTOMER}_mobile.conf already exists. Skipping."
fi
}

PORT=${NODEREDIRECTPORT}
PORTSSL=${NODEPORT}
# Port 10080
# portssl 10443

# Don't change, unless you know...
SITEAVAIL=/etc/nginx/sites-available
SITEENABLE=/etc/nginx/sites-enabled
IPV4LOCAL=`ec2metadata | grep local-ipv4 | cut -d' ' -f 2`

#This script writes out the nginx config.
chknginxservice()
{
if [ ! -f ${SITEAVAIL}/${CUSTOMER} ]
then
echo " Nginx Config: ${SITEAVAIL}/${CUSTOMER} does not exist. Creating."
writenginxconfig
else
echo "Nginx Config: ${SITEAVAIL}/${CUSTOMER} already exists. Skipping."

fi
}


writenginxconfig()
{
cat << EOF >> $SITEAVAIL/${CUSTOMER}
upstream ${CUSTOMER} {
	server 127.0.0.1:${PORT};
}
upstream ${CUSTOMER}ssl {
	server 127.0.0.1:${PORTSSL};
}
server {
	listen ${IPV4LOCAL}:80; 
	server_name ${CUSTOMER}.xtuple.com;
	access_log /var/log/nginx/${CUSTOMER}.xtuple.com.access.log cache;
	error_log /var/log/nginx/${CUSTOMER}.xtuple.com.error.log;
	root /usr/share/nginx/html;
	index index.html index.htm;
	
	location / {
		proxy_pass http://${CUSTOMER};

		proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
		proxy_redirect off;
		proxy_buffering off;
		proxy_http_version 1.1;

		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;

	}
}

server {
	listen ${IPV4LOCAL}:443;
	ssl on;
	ssl_certificate	/etc/ssl/certs/wildcard.bundle.crt;
	ssl_certificate_key /etc/ssl/private/wildcard.xtuple.com.key;
	ssl_verify_depth 3;
	

	server_name ${CUSTOMER}.xtuple.com;
	access_log /var/log/nginx/${CUSTOMER}.xtuple.com.sslaccess.log cache;
	error_log /var/log/nginx/${CUSTOMER}.xtuple.com.sslerror.log;

	root /usr/share/nginx/html;
	index index.html index.htm;
	
	ssl_protocols	SSLv3 TLSv1 TLSv1.1 TLSv1.2;
	ssl_ciphers RC4:HIGH:!aNULL:!MD5;
	ssl_session_cache shared:SSL:10m;
	ssl_session_timeout 10m;
	keepalive_timeout    60;

	location / {
		proxy_pass https://${CUSTOMER}ssl;
		proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
		proxy_redirect off;
		proxy_buffering on;
		proxy_buffers 8 8k;
		proxy_http_version 1.1;
		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
		proxy_cache my-cache;
		proxy_cache_valid 200 302 60m;
		proxy_cache_valid 404 1m;
		proxy_ignore_headers "Set-Cookie";
		proxy_set_header        X-Forwarded-Proto \$scheme;
		add_header      Front-End-Https   on;
		### By default we don't want to redirect it ####
	        proxy_redirect     off;
	}
}
EOF
cd $SITEENABLE && ln -s $SITEAVAIL/${CUSTOMER} .

}

chkbouncer()
{
CHKBOUNCERINI=`grep ${DBNAME} ${BOUNCERINI}`
if [ "$CHKBOUNCERINI" ];
then
echo "${DBNAME} exists in ${BOUNCERINI} as:"
echo "${CHKBOUNCERINI}"
else
echo "${DBNAME} not found in ${BOUNCERINI}. We can write it in there, Yes? or No? (Y/N)"
read WRITELINE

case $WRITELINE in
Y)
cat << EOF >> ${BOUNCERINI}
${DBNAME} = host=${BOUNCEIP} port=${FINDPORT} dbname=${DBNAME} password=${PASS} user=${USER} pool_size=3
EOF
;;
N)
echo "Try again or X to cancel"
chkbouncer
;;

X)
echo "Quitting"
exit 0;
;;
esac
fi
}

writepgbouncer()
{
echo "What pg server should this bounce to?"
echo "Select one of the Options:"
echo "A) 10.0.1.125 (10023)"
echo "B) 10.0.1.239 (10024)"
echo "Enter 'A' or 'B'"
read BOUNCEIP
case $BOUNCEIP in
"A")
BOUNCEIP=10.0.1.125
SSHPORT=10023
OTHER="10.0.1.239"
;;
"B")
BOUNCEIP=10.0.1.239
SSHPORT=10024
OTHER="10.0.1.125"
;;
*)
echo "Invalid - Try again."
writepgbouncer
;;
esac
echo "Let's try to find their PG Port"
FINDCLUSTER=`ssh -i /etc/xtuple/Scripts/ec2-keypair.pem ubuntu@${BOUNCEIP} pg_lsclusters -h | grep $CUSTOMER`

if [ "$FINDCLUSTER" ];
then
FINDPORT=`ssh -i /etc/xtuple/Scripts/ec2-keypair.pem ubuntu@${BOUNCEIP} pg_lsclusters -h | grep $CUSTOMER | tr -s " " | cut -d ' ' -f 3`
echo "Found $CUSTOMER db cluster on $BOUNCEIP on ${FINDPORT}"
echo "searching pgbouncer.ini for a similar entry"
chkbouncer
else
echo "Database for $CUSTOMER doesn't exist on $BOUNCEIP. Try $OTHER"
# BOUNCEIP=${OTHER}
# FINDPORT=`ssh -i /etc/xtuple/ec2-keypair.pem ubuntu@${BOUNCEIP} pg_lsclusters -h | grep $CUSTOMER | tr -s " " | cut -d ' ' -f 3`
writepgbouncer
fi
}

echo "You Entered: $1, $2, $3, $4, $5, $6"
echo "This look OK? (Y/N)"
read HUH
case $HUH in
Y)

checkconfigdir
writeconfigjs
#writenodeservice
#writenginxconfig
chknodeservice
chknginxservice
writepgbouncer

echo "wrote all configs"
;;
N)
echo "quitting"
;;
esac

exit 0;
