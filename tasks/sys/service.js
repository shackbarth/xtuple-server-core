var lib = require('../../lib'),
  format = require('string-format'),
  _ = require('lodash'),
  exec = require('execSync').exec,
  fs = require('fs'),
  path = require('path');

/**
 * Create a process manager service
 */
_.extend(exports, lib.task, /** @exports service */ {

  /** @override */
  beforeInstall: function (options) {
    options.sys.initd = '/etc/init.d/xtuple';
    options.sys.pm2 = {
      template: fs.readFileSync(path.resolve(__dirname, 'pm2-core-services.json')).toString(),
      configfile: path.resolve(options.xt.configdir, 'services.json'),
      initscript: path.resolve(__dirname, 'pm2-init.sh')
    };
  },

  /** @override */
  beforeTask: function (options) {
    if (fs.existsSync(path.resolve(options.sys.sbindir, 'main.js'))) {
      fs.unlinkSync(path.resolve(options.sys.sbindir, 'main.js'));
    }
  },

  /** @override */
  executeTask: function (options) {
    if (/^setup/.test(options.planName)) {
      exports.setupServiceManager(options);
    }
    else {
      exports.installService(options);
    }
  },

  /** @override */
  uninstall: function (options) {
    exec('xtupled delete {sys.pm2.configfile}'.format(options));
    exec('HOME=/usr/local/xtuple xtupled dump');
  },

  /** @override */
  afterInstall: function (options) {
    console.log(exec('service xtuple {xt.version} {xt.name} status'.format(options)).stdout);
  },

  /**
   * Perform initial setup of the service management system.
   */
  setupServiceManager: function (options) {
    // pm2 finds this very cleansing for some reason
    exec('xtupled kill');

    exec('chmod a+x {xt.userhome}'.format(options));
    exec('chmod a+x {xt.userhome}/{xt.version}'.format(options));
    exec('chmod a+x {xt.usersrc}'.format(options));
    exec('chmod a+x {xt.usersrc}/node-datasource'.format(options));

    if (fs.existsSync(options.sys.initd)) {
      exec('update-rc.d -f xtuple remove');
      fs.unlinkSync(options.sys.initd);
    }

    // create upstart service "xtuple"
    exec('cp {sys.pm2.initscript} {sys.initd}'.format(options));
    exec('update-rc.d xtuple defaults');
  },

  /**
   * Install a particular account into the service manager
   */
  installService: function (options) {
    // link the executable
    fs.symlinkSync(
      path.resolve(options.xt.usersrc, 'node-datasource/main.js'),
      path.resolve(options.sys.sbindir, 'main.js')
    );

    // write service config files
    fs.writeFileSync(options.sys.pm2.configfile, options.sys.pm2.template.format(options));

    var start = exec('xtupled start {sys.pm2.configfile}'.format(options));

    if (start.code !== 0) {
      throw new Error(JSON.stringify(start));
    }

    exec('HOME=/usr/local/xtuple xtupled dump');
    exec('service xtuple {xt.version} {xt.name} restart'.format(options));
  }
});
