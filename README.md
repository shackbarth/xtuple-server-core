## RTFM
By design, this program is capable of granting/revoking system-level permissions, destroying data, and other very powerful things. If you plan to run this program in any production-like arena or on any machine with personal or customer data on it, read this ENTIRE DOCUMENT first. If you do not, you will probably wish you had. **You have been warned.**

# xTuple Server
[![Build Status](https://magnum.travis-ci.com/xtuple/xtuple-scripts.svg?token=gns5sJtFWu8Pk688aPh7)](https://magnum.travis-ci.com/xtuple/xtuple-scripts)

This is the **xTuple Server**. It installs, configures, runs, serves, secures, backs up, restores, forks, upgrades, pilots, monitors and manages your xTuple appliance, demo, cloud app, or development environment. [Now with 37% more cloud support!](http://www.theonion.com/video/hp-on-that-cloud-thing-that-everyone-else-is-talki,28789/)

# 0. Quickstart

### Installation
#### 1. "bootstrap"
  - What does it do?
    - Installs system dependencies; its only prerequisite is a Ubuntu operating system
    - Clones this repository and installs the `xtuple-server` CLI into the global path
  - How do I make it do those things?
    - `wget git.io/67JeUg -qO- | sudo bash`

#### 2. "xtuple-server"
  - What does it do?
    - Sets up users, permissions, packages, services
    - Configures quite a lot of murky OS-level unpleasantness
    - Install new accounts, restore databases, backup clusters, etc.
    - Manages xTuple services
  - How do I make it install something?
    - `sudo xtuple-server install --xt-version 4.4.0 --xt-name something --xt-demo`

This installs a single database called `xtuple_demo` for a user `something`. Secure credentials
and other access info are generated for you, they will be shown in a report once
installation is finished. Get a pen ready; for security, they are not saved in any file, and you 
will have a limited amount of time to write them down.

For more information and details on how to perform more serious stuff, keep reading.

### Development
  You can develop on the xTuple Server like you might develop most other node.js
  apps. Since this app is designed to be installed globally, set the following
  environment variable to point to your `xtuple-scripts` repository:
  - `XTSERVER_SRCDIR`

  To run your changes, you can invoke the `xtuple-server` CLI script like so:
  - `XTSERVER_SRCDIR=. ./server-cli install ...`

  It's our job at xTuple to maintain this server and keep it bug-free. Hopefully
  you won't have to spend any time hacking in here. If you run into problems,
  please file an issue in github.

# 1. Install

### ~ System Requirements
  - Ubuntu 12.04 or 14.04 Operating System
  - > 4GB RAM
  - Internet Access

### a. System Dependencies

  - `bootstrap.sh` installs all system dependencies. Here are a few of my favorites:
    - `nginx      >  v1.4.6`
    - `nodejs     >  v0.8.26`
    - `npm        >  v1.3.0`
    - `postgres   >= v9.3`
    - `cups       >  v1.5`
    - `sshd       >  v1.5`

### b. Self-tests

  The `bootstrap.sh` will run a series of self-diagnostic tests on the machine
  after it installs the system dependencies. 

### c. Variables and Defaults

By default, the following variables are set by `bootstrap.sh`:
  - `XT_NODE_VERSION=0.8.26`
  - `XT_PG_VERSION=9.3`

### d. Running the installer
The `xtuple-server` command-line program is installed by `bootstrap.sh`. It requires `sudo` privileges.

#### 0. Prologue

  - Postgres is installed for you. So are nginx and node.js. And everything else.
  - The Installer prefers to fail for trivial reasons than to potentially install an app incorrectly. Failure is designed to be obvious. Here are some common reasons it might decide to fail:
    - An SSL bundle `.zip` that is of another format besides the Namcheap PositiveSSL email attachment. 
    - Some other slightly wrong was given; a wrong version number, a typo in the edition, etc.
    - The provided database file is not able to be automatically mobile-ized
  
  - The Installer generates credentials. And users. And everything else.
    - Before running the installer, find a pen and paper. When the installer finishes, it displays credentials.
    - And on that note: if you are installing over SSH, failure to follow these instructions could result in being locked out of the machine **irreversibly**, regardless of how much `sudo` you think you have.
    - If you think a config is wrong, [file a bug report](https://github.com/xtuple/xtuple-scripts/issues?state=open). Changing it by hand will probably break some automatically-installed thing you didn't know existed.
    - Do not install anything else on the machine. If you need additional packages for an xTuple installation, it needs to be written as an add-on module to the installer. File an issue.

#### 1. Examples

  - Basic quickstart cloud deployment example:
    - `xtuple-server install --xt-version 4.4.0 --xt-name cloudinator --pg-capacity 64 --xt-quickstart`
    - `--pg-capacity 64` declares that this server has 64 available installation slots
    - `--xt-quickstart` instructs the installer to install the xTuple Quickstart database
  
  - Production appliance deployment example:
      ```
      xtuple-server install --xt-version 4.4.0 --xt-name tesla --pg-capacity 1
        --nginx-inzip tesla_ssl_bundle.zip
        --nginx-inkey tesla_ssl.key
        --xt-maindb tesla_full.backup
        --xt-edition enterprise
      ```
    - `--pg-capacity 1` tunes xTuple to make maximum use of all available machine resources

# 2. Manage

## ~ Command Line

### a. System Services

The xTuple Server is comprised of a collection of system services that work together to run the application. The required services are installed automatically using the installer:

  - Postgres Database Server
  - xTuple Datasource (the mobile web application server)
  - xTuple Health Feed (monitors system health)
  - xTuple Snapshot Manager (auto-backups databases)
  - pm2 Process Manager
  - Webmin control panel

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

## ~ Command Center

### a. Webmin
The Production xTuple Server includes a `setup-webmin` plan that you can and should invoke immediately after running `bootstrap. It provides a web-based interface for deploying new xTuple Server instances.
  - `sudo xtuple-server setup-webmin`
  - Access it in your browser at xtremote.<domain>/_manage
  - Log in with the `xtremote` user, and navigate on the left to **Others -> Custom Commands**, and you will see a list that looks like this:
      ![xTuple Webmin Commands](https://s3.amazonaws.com/com.xtuple.deploy-assets/webmin-command-list.png)
  - The "New xTuple Deployment" command, for example, looks like this:
      ![xTuple Webmin Commands](https://s3.amazonaws.com/com.xtuple.deploy-assets/webmin-command-form.png)

### b. xTuple Web Client Toolkit

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
