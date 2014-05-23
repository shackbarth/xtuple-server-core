var lib = require('../../lib'),
  fs = require('fs'),
  rimraf = require('rimraf'),
  exec = require('execSync').exec,
  path = require('path'),
  _ = require('lodash'),
  global_policy_filename = 'XT00-xtuple-global-policy',
  user_policy_filename = 'XT10-xtuple-user-policy',
  sudoers_d = path.resolve('/etc/sudoers.d');

/**
 * Setup machine access policies.
 */
_.extend(exports, lib.task, /** @exports policy */ {

  options: {
    mode: {
      optional: '[mode]',
      description: 'System mode {dedicated|cloud|other}',
      value: 'other'
    }
  },

  /** @override */
  beforeInstall: function (options) {
    var userBlacklist = [
      'xtuple',
      'xtadmin',
      'xtremote',
      'root',
      'admin',
      'vagrant',
      'postgres'
    ];
    if (_.contains(userBlacklist, options.xt.name)) {
      throw new Error('Name of xTuple instance is reserved for system use: '+ options.xt.name +
        '. Please provide a different name.');
    }
  },

  /** @override */
  beforeTask: function (options) {
    // if customer appears new, that is they've provided no main database,
    // snapshot to restore from, or admin password, generate a admin password
    if (!_.isEmpty(options.xt.name) && !options.xt.adminpw && !options.xt.maindb) {
      options.xt.adminpw = exports.getPassword();
    }

    if (options.planName === 'setup') {
      options.sys.policy.remotePassword = exports.getPassword();
    }

    if (!_.isEmpty(options.xt.name) && exec('id -u {xt.name}'.format(options)).code !== 0) {
      options.sys.policy.userPassword = exports.getPassword();
    }
  },

  /** @override */
  executeTask: function (options) {
    if (options.planName === 'setup') {
      exports.createSystemPolicy(options);
    }
    else {
      exports.createUserPolicy(options);
    }
  },

  /** @override */
  afterInstall: function (options) {
    exec('rm -f ~/.pgpass');
    exec('rm -f ~/.bash_history');
    exec('rm -f /root/.bash_history');

    exec('chmod a-w {xt.configdir}/install-arguments.json'.format(options));
    exec('chmod a-w {xt.configdir}/install-results.json'.format(options));
  },

  /** @override */
  afterTask: function (options) {
    exec('service ssh reload');
  },

  getPassword: function () {
    exec('sleep 1');
    var pass = exec('openssl rand 6 | base64');
      
    if (pass.code === 0 && !_.isEmpty(pass.stdout)) {
      return pass.stdout.trim().replace(/\W/g, '');
    }
    else {
      throw new Error('Failed to generate password: '+ JSON.stringify(pass));
    }
  },

  /** @private */
  createSystemPolicy: function (options) {
    var global_policy_src = fs.readFileSync(path.resolve(__dirname, global_policy_filename)).toString(),
      global_policy_target = path.resolve(sudoers_d, global_policy_filename),
      system_users = [
        'addgroup xtuser',
        'addgroup xtadmin',
        'useradd xtremote -d /usr/local/xtremote -p {sys.policy.remotePassword}'.format(options),
        'adduser xtadmin --disabled-login',
        'usermod -a -G xtadmin,xtuser,www-data,postgres,lpadmin,ssl-cert xtremote',
        'usermod -a -G ssl-cert,xtuser postgres',
      ],
      system_ownership = [
        'chown -R xtadmin:xtuser /etc/xtuple',
        'chown -R xtadmin:xtuser /var/log/xtuple',
        'chown -R xtadmin:xtuser /var/lib/xtuple',
        'chown -R xtadmin:xtuser /usr/sbin/xtuple',
        'chown -R xtadmin:xtuser /usr/local/xtuple',
        'chown -R postgres:xtuser /var/run/postgresql'
      ],
      system_mode = [
        'chmod -R g=x,o-wr /etc/xtuple/',
        'chmod -R g=rx,u=rwx,o-wr /var/lib/xtuple',
        'chmod -R g=rx,u=rwx,o=rx /usr/sbin/xtuple',
        'chmod -R g=rx,u=rwx,o=rx /usr/local/xtuple',
        'chmod -R g=rwx,u=rwx,o=rx /usr/local/xtuple/.pm2',
        'chmod -R g+wrx /var/run/postgresql'
      ],
      sudoers_chmod, visudo_cmd;

    // create system users
    if (options.sys.policy.remotePassword) {
      _.map(system_users, exec);
      _.map(_.flatten([ system_ownership, system_mode ]), exec);
      var htpasswd = exec('htpasswd -cb {sys.htpasswdfile} xtremote {sys.policy.remotePassword}'.format(options));
      if (htpasswd.code !== 0) {
        throw new Error(htpasswd.stdout);
      }
    }
    // write sudoers file
    if (!fs.existsSync(global_policy_target)) {
      fs.writeFileSync(global_policy_target, global_policy_src);
    }

    // set correct permissions (enforced by OS)
    sudoers_chmod = exec('chmod 440 /etc/sudoers.d/*');
    if (sudoers_chmod.code !== 0) {
      throw new Error(JSON.stringify(sudoers_chmod, null, 2));
    }

    // validate sudoers files
    visudo_cmd = exec('visudo -c');
    if (visudo_cmd.code !== 0) {
      throw new Error(JSON.stringify(visudo_cmd, null, 2));
    }

    // set xtremote shell to bash
    exec('sudo chsh -s /bin/bash xtremote'.format(options));
  },

  /** @private */
  createUserPolicy: function (options) {
    var user_policy_src = fs.readFileSync(path.resolve(__dirname, user_policy_filename)).toString(),
      user_policy_target = path.resolve(
        sudoers_d,
        user_policy_filename.replace('user', '{xt.name}').format(options)
      ),
      xtuple_users = [
        'useradd {xt.name} -d /usr/local/{xt.name} -p {sys.policy.userPassword}'.format(options),
        'usermod -a -G postgres,xtuser {xt.name}'.format(options),
        'chage -d 0 {xt.name}'.format(options)
      ],
      user_ownership = [
        'chown -R :xtuser {pg.logdir}'.format(options),
        'chown -R {xt.name}:xtuser {xt.logdir}'.format(options),
        'chown -R {xt.name}:xtuser {xt.configdir}'.format(options),
        'chown -R {xt.name}:xtuser {xt.statedir}'.format(options),
        'chown -R {xt.name}:xtuser {xt.userPm2dir}'.format(options),
        'chown -R {xt.name}:xtuser {xt.rundir}'.format(options),
        'chown -R {xt.name}:xtuser {sys.sbindir}'.format(options),
        'chown -R {xt.name}:ssl-cert {xt.ssldir}'.format(options)
      ],
      user_mode = [
        'chmod -R u=rwx,g=wx {xt.logdir}'.format(options),
        'chmod -R u=rwx,g=wx {pg.logdir}'.format(options),
        'chmod -R u=rwx,g-rwx {xt.statedir}'.format(options),
        'chmod -R g=rx,u=wrx,o-rwx {xt.ssldir}'.format(options),
        'chmod -R g=rwx,u=wrx,o-rw {xt.configdir}'.format(options),
        'chmod -R g-rwx,u=wrx,o-rwx {xt.userPm2dir}'.format(options)
      ];

    // create *this* user, and set access rules
    if (options.sys.policy.userPassword) {
      _.map(xtuple_users, exec);
      _.map(_.flatten([ user_ownership, user_mode ]), exec);
    }

    if (!fs.existsSync(user_policy_target)) {
      fs.writeFileSync(user_policy_target, user_policy_src.format(options));
    }

    // set user shell to bash
    exec('sudo chsh -s /bin/bash {xt.name}'.format(options));
  },

  /** @override */
  uninstall: function (options) {
    //exec('skill -KILL -u xtremote'.format(options));
    if (!_.isEmpty(options.xt.name)) {
      exec('skill -KILL -u {xt.name}'.format(options));
      //exec('deluser {xt.name}'.format(options));  XXX no user, no cluster owner = strangeness
      exec('rm -rf /usr/local/{xt.name}'.format(options));
      exec('rm -f '+ path.resolve('/etc/sudoers.d/', user_policy_filename.replace('user', '{xt.name}').format(options)));
    }
  }
});
