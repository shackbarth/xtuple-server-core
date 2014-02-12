#!/bin/bash
service nginx stop
service xtuple start
cd /usr/local/xtuple/xtuple
npm run-script test-datasource
npm run-script test
#add in pgbouncer
pushd /etc/xtuple
cp config.js config.bak
cat config.bak | sed 's/port: 5432,/port: 6432,/' | sed 's/pgPoolSize: 15,/pgPoolSize: 1,/' > config.js 
service xtuple restart
popd
npm run-script test-datasource
npm run-script test
#add in nginx
pushd /etc/xtuple
cp config.js config.bak
cat config.bak | sed 's/redirectPort: 80,/redirectPort: 81,/' | sed 's/proxyPort: null,/proxyPort: 443,/' | sed 's/port: 443,/port: 444,/' > config.js 
popd
service xtuple stop
service nginx start
service xtuple start
npm run-script test-datasource
npm run-script test
