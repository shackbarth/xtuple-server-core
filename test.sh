#!/bin/bash
service xtuple start
cd /usr/local/xtuple/xtuple
npm run-script test-datasource
npm run-script test
