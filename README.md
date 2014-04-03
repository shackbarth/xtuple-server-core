xtuple-scripts
==============

[![Build Status](https://magnum.travis-ci.com/xtuple/xtuple-scripts.svg?token=gns5sJtFWu8Pk688aPh7)](https://magnum.travis-ci.com/xtuple/xtuple-scripts)

## New Server Installation
1. Place `/lib/sys/bootstrap.sh` on the filesystem.
1. Place database backup file on filesystem, if applicable.
2. Place `.key` (SSL private key) and `.crt` (SSL certificate) files on the filesystem,
  if applicable.
3. Bootstrap the machine.

### bootstrap.sh

    Usage:

      bootstrap.sh [options]

    Example:

      Bootstrap the machine but do not install xTuple yet: (TODO)

        sudo bash bootstrap.sh --clean
      
      Setup a fresh 1.8.1 installation with demo and quickstart:

        sudo bash bootstrap.sh 1.8.1 --pg-name kelhay --nginx-domain mobile.kellyhayes.com

      Setup a customer:

        sudo bash bootstrap.sh 1.8.1 --pg-name kelhay --nginx-domain mobile.kellyhayes.com --xt-maindb kelhay.backup

    Required Arguments:

      --pg-name <name>            Name of the installation
      --xt-appdir <path>          Path to the xtuple application directory

    Options:

      --pg-version [version]      Version of postgres to install
      --pg-mode [string]          Installation mode (production|staging|demo|development) [development]
      --pg-slots [int]            Number of provisioned "slots" to consume
      --pg-slots [slots]          Number of slots to consume
      --pg-locale [string]        Cluster locale
      --nginx-domain [domain]     The public domain name that will point to this web server
      --nginx-crt [file]          Path to SSL certificate (.crt)
      --nginx-key [file]          Path to SSL public key (.key)
      --xt-version [version]      xTuple Mobile App Version
      --xt-maindb [path]          Path to primary database .backup file to use in production
      --xt-setupdemos [boolean]   Set to additionally install the demo databases
      --xt-masterref [boolean]    @deprecated. Set this flag to install masterref from assets/
      --xt-configdir [path]       Location of datasource config file.
      --xt-logdir [path]          Location of log files for node service
      --xt-pilot [boolean]        Additionally create a pilot area using a copy of the main database
      --xt-extensions [csv]       Comma-delimited list of extensions to install
      --xt-verify [boolean]       Whether to require all tests to pass before certifying this installation (TODO)

### service xtuple

    Usage:

      service xtuple [version] [name] {install|start|stop|restart}
      service xtuple {list|stopall|restartall}

    Example:

      Start or stop the "kelhay" xTupe Server:

        sudo service xtuple 1.8.1 kelhay start
        sudo service xtuple 1.8.1 kelhay stop

      List all running servers:

        sudo service xtuple list

### service xtuple install

    Usage:

      service xtuple [version] [name] install [options]

    Example:

      sudo service xtuple 1.8.1 tesla install --pg-version 9.3 --xt-verify

    Options:

      --pg-version [version]      Version of postgres to install
      --pg-env [string]           Installation mode (production|staging|demo|development) [development]
      --pg-slots [int]            Number of provisioned "slots" to consume
      --pg-slots [slots]          Number of slots to consume
      --pg-locale [string]        Cluster locale [en_US.UTF-8]
      --nginx-domain [domain]     The public domain name that will point to this web server
      --nginx-crt [file]          Path to SSL certificate (.crt)
      --nginx-key [file]          Path to SSL public key (.key)
      --xt-version [version]      xTuple Mobile App Version
      --xt-maindb [path]          Path to primary database .backup file to use in production
      --xt-setupdemos [boolean]   Set to additionally install the demo databases
      --xt-masterref [boolean]    @deprecated. Set this flag to install masterref from assets/
      --xt-configdir [path]       Location of datasource config file.
      --xt-logdir [path]          Location of log files for node service
      --xt-pilot [boolean]        Additionally create a pilot area using a copy of the main database
      --xt-extensions [csv]       Comma-delimited list of extensions to install
      --xt-verify [boolean]       @todo Whether to require all tests to pass before
                                  certifying this installation

