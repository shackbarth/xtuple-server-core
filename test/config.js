module.exports = {
  "processName": "xt-web-admin",
  "allowMultipleInstances": true,
  "client": {
    "freeDemo": false,
    "encoding": "rjson"
  },
  "datasource": {
    "debugging": false,
    "debugDatabase": false,
    "enhancedAuthKey": "xTuple",
    "sessionTimeout": 60,
    "requireCache": true,
    "pgPoolSize": 15,
    "pgWorker": false,
    "bindAddress": "0.0.0.0",
    "redirectPort": 8888,
    "proxyPort": null,
    "port": 8443,
    "encryptionKeyFile": "/etc/xtuple/4.4.0/xtmocha/key256.txt",
    "keyFile": "/etc/xtuple/4.4.0/xtmocha/ssl/server.key",
    "certFile": "/etc/xtuple/4.4.0/xtmocha/ssl/server.crt",
    "caFile": null,
    "saltFile": "/etc/xtuple/4.4.0/xtmocha/rand64.txt",
    "xTupleDbDir": "/usr/local/xtuple/databases",
    "psqlPath": "psql",
    "nodePath": "node",
    "smtpHost": "",
    "smtpPort": 587,
    "smtpUser": "",
    "smtpPassword": "",
    "printer": "",
    "name": "localhost",
    "description": "xt-440-xtmocha",
    "hostname": "xt-440-xtmocha.localhost",
    "location": "NA",
    "databases": [
      "xtuple_demo"
    ],
    "testDatabase": "xtuple_demo"
  },
  "integration": {},
  "extensionRoutes": [],
  "databaseServer": {
    "hostname": "/var/run/postgresql",
    "port": 5432,
    "user": "admin"
  },
  "biServer": {
    "bihost": "localhost",
    "port": 8080,
    "httpsport": 8443,
    "catalog": "xTuple",
    "tenantname": "default",
    "restkeyfile": "/etc/xtuple/lib/rest-keys"
  }
};