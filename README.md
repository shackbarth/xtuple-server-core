[![Build Status](https://magnum.travis-ci.com/xtuple/xtuple-scripts.svg?token=gns5sJtFWu8Pk688aPh7)](https://magnum.travis-ci.com/xtuple/xtuple-scripts)

### Example New Server Installation
1. `sudo bash bootstrap.sh`
2. `sudo xtuple-server install plan.json --xt-version 4.4.1 --xt.name example-server`

  By default, the following variables are set by `bootstrap.sh`:
  - `XT_NODE_VERSION=0.8.26`
  - `XT_PG_VERSION=9.3`

  Using the commands above, a simple server will be installed with a single
  database called `xtuple_demo`.

## xtuple-server CLI

    Usage:
    
      sudo xtuple-server {install|run} <planfile> --xt-version <version> --xt-name <name>

    Options:

      --pg-mode [mode]              Installation mode {dedicated|cloud|testing}. [dedicated]
      --pg-version [version]        Version of postgres to install [9.3]
      --pg-slots [int]              Number of provisioned "slots" to consume [1]
      --pg-locale [string]          Cluster locale [en_US]
      --pg-timezone [integer]       Integer offset from UTC; e.g., "-7" is PDT, "-8" is PST, etc
      --pg-restore [boolean]        Restore the most recent backup [false]
      --pg-snapschedule [cron]      crontab entry for snapshot schedule [@daily]
      --pg-snapshotcount [integer]  The number of backup snapshots to retain [7]

      --nginx-inzip [file]          Path to SSL trust chain archive
      --nginx-incrt [file]          Path to SSL certificate (.crt)
      --nginx-inkey [file]          Path to SSL private key (.key)
      --nginx-domain [domain]       The public domain name that will point to this web server [localhost]

      --xt-version <version>        xTuple Mobile App Version (required)
      --xt-name <name>              Name of the installation  (required)
      --xt-pilot [boolean]          Additionally create a pilot area using a copy of the main database [false]
      --xt-maindb [path]            Path to primary database .backup/.sql filename to use in production
      --xt-edition [string]         The xTuple Edition to install {core|distribution|manufacturing|enterprise} [core]
      --xt-demo [boolean]           Set to additionally install the demo database [false]
      --xt-quickstart [boolean]     Set to additionally install the quickstart database [false]
      --xt-adminpw [password]       Password for the database "admin" user for a new database

      // TODO
      --pg-host [host]              Postgres server host address [localhost]

