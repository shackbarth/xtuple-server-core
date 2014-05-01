[![Build Status](https://magnum.travis-ci.com/xtuple/xtuple-scripts.svg?token=gns5sJtFWu8Pk688aPh7)](https://magnum.travis-ci.com/xtuple/xtuple-scripts)

This is the **xTuple Server**. It installs, configures, runs, serves, backs up, restores, forks, upgrades, pilots, monitors and manages your xTuple appliance, cloud app, or development environment. [Now with 37% more cloud support!](http://www.theonion.com/video/hp-on-that-cloud-thing-that-everyone-else-is-talki,28789/)

# 0. Quickstart

### Installation
The xTuple Server has two components
#### 1. "bootstrap"
  - What does it do?
    - Installs system dependencies; its only prerequisite is a Ubuntu operating system
    - Clones this repository and installs the `xtuple-server` CLI into the global path
  - How do I make it do those things?
    1. Grab the file [here](https://github.com/xtuple/xtuple-scripts/blob/master/bootstrap.sh).
    2. `$ sudo bash bootstrap.sh`

#### 2. "xtuple-server"
  - What does it do?
    - Sets up users, permissions, packages, services
    - Configures quite a lot of murky OS-level unpleasantness
    - Install new accounts, restore databases, backup clusters, etc.
    - Manages xTuple services
  - How do I make it install something?
    - `sudo xtuple-server install --xt-version 4.4.0 --xt-name something --xt-demo`

This installs a single database called `xtuple_demo` for a user `something`. Secure credentials
and other access info are generated for you, and if you're lucky, they will be shown in a report once
installation is finished.

For more information and details on how to perform more advanced installs, keep reading.

### Development

# 1. Install

### a. System Dependencies

  - `bootstrap.sh` installs all system dependencies. Here are a few of my favorites:
    - `nginx      >  v1.4.7`
    - `nodejs     >  v0.8.26`
    - `npm        >  v1.3.0`
    - `postgres   >= v9.3` (**9.3** is installed by default; see 1c)
    - `cups       >  v1.5`
    - `sshd       >  v1.5`

### b. Self-tests

  The `bootstrap.sh` will run a series of self-diagnostic tests on the machine
  after it installed the system dependencies. You should also run these
  yourself! They are fun. Everybody's doing it.

  - `sudo npm run-script test-9.1        // test against postgres 9.1`
  - `sudo npm run-script test-9.3        // test against postgres 9.3`

### c. Variables and Defaults

By default, the following variables are set by `bootstrap.sh`:
  - `XT_NODE_VERSION=0.8.26`
  - `XT_PG_VERSION=9.3`

### d. Running the installer

The `xtuple-server` command-line program is installed by `bootstrap.sh`. It requires `sudo` privileges.

  - Basic quickstart cloud deployment example:
    - `xtuple-server install --xt-version 4.4.0 --xt-name initech --pg-mode cloud --xt-quickstart`
    - `--pg-mode cloud` provisions a portion of the machine's resources for this install
    - `--xt-quickstart` instructs the installer to install the xTuple Quickstart database
  
  - Production appliance deployment example:
      ```
      xtuple-server install --xt-version 4.4.0 --xt-name tesla --pg-mode dedicated
        --nginx-inzip tesla_ssl_bundle.zip
        --nginx-inkey tesla_ssl.key
        --xt-maindb tesla_full.backup
        --xt-edition enterprise
      ```
    - `--pg-mode dedicated` tunes postgres to make maximum use of all available machine hardware resources

# 2. Manage

### a. System Services

The xTuple Server is comprised of a collection of system services that work together to run the application. The required services are installed automatically using the installer:

  - Postgres Database Server
  - xTuple Datasource (the mobile web application server)
  - xTuple Health Feed (monitors system health)
  - xTuple Snapshot Manager (auto-backups databases)
  - pm2 Process Manager

The xTuple Service can be managed using the following command template: `service xtuple <version> <name> {restart|status}`. More information on this is in the following sections.

### b. Show xTuple Server Status

  - `service xtuple <version> <name> status`
    - see the status of the xTuple services.
    - Example: `service xtuple 4.4.0 xtmocha status` will output a table like this:
      ![xTuple Service Manager](https://s3.amazonaws.com/com.xtuple.deploy-assets/pm2-table-2.png)

  - `pg_lsclusters`
    - show Postgres server status and info.
    ```
    Ver Cluster  Port Status Owner    Data directory                   Log file
    9.3 xtmocha  5432 online xtmocha  /var/lib/postgresql/9.3/xtmocha  /var/log/postgresql/postgresql-9.3-xtmocha.log
    ```

  - `service xtuple help`
    - outputs help info

#### c. Control your xTuple Server

  - `pg_ctlcluster <version> <name> {restart|stop|start}`
    - Control your Postgres server
  
  - `service xtuple <version> <name> restart`
    - Restart all xTuple services
    - Example: `service xtuple 4.4.0 xtmocha restart` will restart all the xTuple services for the user `xtmocha`

### d. Health Monitor

By default, the xTuple Server pro-actively monitors the health of the system on which it is installed. The `xtuple-healthfeed` process maintains a log of the server's vital signs.

### f. Command Center

  - **TODO document**

# 3. Reference

### xtuple-server CLI

    Usage:
    
      sudo xtuple-server {install|backup|restore|fork} --xt-version <version> --xt-name <name>

    Options:

      --pg-version [version]        Version of postgres to install [9.3]
      --pg-slots [int]              Number of provisioned slots to consume [1]
      --pg-capacity [int]           Number of slots available on the machine [1]

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
