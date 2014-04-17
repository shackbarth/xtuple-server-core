[![Build Status](https://magnum.travis-ci.com/xtuple/xtuple-scripts.svg?token=gns5sJtFWu8Pk688aPh7)](https://magnum.travis-ci.com/xtuple/xtuple-scripts)

This is the xTuple Server. It installs, runs, serves, snapshots, restores, upgrades, pilots, and monitors your xTuple system.

# 0. Quickstart

### Server Installation Basics
1. `sudo bash bootstrap.sh`
2. `sudo xtuple-server install --xt-version 4.4.1 --xt.name mydemo --xt-quickstart`

This installs a single database called `xtuple_quickstart`. Secure credentials
and other access info are generated for you and will be shown in a report once
installation is finished.

# 1. Info

### a. System Dependencies

  - `bootstrap.sh` installs all system dependencies. Here are a few of my favorites:
    - `nginx      >  v1.4.7`
    - `nodejs     >  v0.8.26`
    - `npm        >  v1.3.0`
    - `postgres   >= v9.1` (**9.3** is installed by default; see 1c)
    - `cups       >  v1.5`
    - `sshd       >  v1.5`

### b. Self-tests

  The `bootstrap.sh` will run a series of self-diagnostic tests on the machine
  after it installed the system dependencies. You should also run these
  yourself! They are fun.

  - `sudo npm run-script test-9.1        // test against postgres 9.1`
  - `sudo npm run-script test-9.3        // test against postgres 9.3`

### c. Variables and Defaults

  - By default, the following variables are set by `bootstrap.sh`:
    - `XT_NODE_VERSION=0.8.26`
    - `XT_PG_VERSION=9.3`

### d. System Service

  - **TODO document**

### e. Health Monitor

  - **TODO document**

### f. Command Center

  - **TODO document**

# 2. Usage and Examples
  
  - **TODO document**

# 3. Reference

### xtuple-server CLI

    Usage:
    
      sudo xtuple-server {install|backup|restore|upgrade|test} --xt-version <version> --xt-name <name>

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
