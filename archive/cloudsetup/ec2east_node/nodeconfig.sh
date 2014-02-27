#!/bin/bash

[ -z "$XTHOME" ] && { echo "XTHOME is not set"; exit -1; }
[ -z "$XTCODE" ] && { echo "XTCODE is not set"; exit -1; }
[ -z "$NODEREDIRECTPORT" ] && { echo " nodeconfig NODEREDIRECTPORT is not set"; exit -1; }
[ -z "$NODEPORT" ] && { echo "NODEPORT is not set"; exit -1; }
[ -z "$CUSTOMER" ] && { echo "CUSTOMER is not set"; exit -1; }
[ -z "$DBUSER" ] && { echo "DBUSER is not set"; exit -1; }
[ -z "$DBPASS" ] && { echo "DBPASS is not set"; exit -1; }

checkconfigdir()
{
if [ ! -d "${XTHOME}/${CUSTOMER}" ];
then
echo "Creating Directory with mkdir -p ${XTHOME}/${CUSTOMER}"
mkdir -p ${XTHOME}/${CUSTOMER}/lib
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
      user: "${DBUSER}",
      password: "${DBPASS}"
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

checknodeservice()
{
if [ ! -f /etc/init/${CUSTOMER}_mobile.conf ];
then
echo "${CUSTOMER}_mobile.conf does not exist. Creating."
writenodeservice
else
echo "${CUSTOMER}_mobile.conf already exists. Skipping."
fi
}
checkconfigdir
writeconfigjs
checknodeservice
