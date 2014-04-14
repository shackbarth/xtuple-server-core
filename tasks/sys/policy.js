(function () {
  'use strict';

  /**
   * Setup machine access policies.
   */
  var policy = exports;

  var task = require('../../lib/task'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('underscore'),
    global_policy_filename = 'XT00-xtuple-global-policy',
    user_policy_filename = 'XT10-xtuple-user-policy',
    sudoers_d = path.resolve('/etc/sudoers.d');

  _.extend(policy, task, /** @exports policy */ {

    beforeTask: function (options) {
      options.xt.homedir = path.resolve('/usr/local/xtuple');
      options.sys.userHomeDir = path.resolve('/usr/local', options.xt.name);
      options.sys.policy.userPassword = policy.getPassword();
      options.sys.policy.remotePassword = policy.getPassword();

      exec('mkdir -p /var/run/postgresql'.format(options));
    },

    /** @override */
    doTask: function (options) {
      policy.createUsers(options);
      policy.configureSSH(options);
    },

    /** @override */
    afterInstall: function (options) {
      exec('rm -f ~/.pgpass');
      exec('rm -f ~/.bash_history');
      exec('rm -f /root/.bash_history');
    },

    /** @override */
    afterTask: function (options) {
      exec('service ssh reload');
    },

    getPassword: function () {
      return exec('openssl rand 6 | base64').stdout.replace(/\W/g, '');
    },

    /**
     * Create users and set permissions
     * @private
     */
    createUsers: function (options) {
      var xt = options.xt,
        global_policy_src = fs.readFileSync(path.resolve(__dirname, global_policy_filename)).toString(),
        global_policy_target = path.resolve(sudoers_d, global_policy_filename),
        user_policy_src = fs.readFileSync(path.resolve(__dirname, user_policy_filename)).toString(),
        user_policy_target = path.resolve(
          sudoers_d,
          user_policy_filename.replace('user', '{xt.name}').format(options)
        ),
        system_users = [
          'addgroup xtuser',
          'addgroup xtadmin',
          'useradd xtremote -p {sys.policy.remotePassword}'.format(options),
          'adduser xtadmin --disabled-login',
          'usermod -a -G xtadmin,xtuser,www-data,postgres,lpadmin,ssl-cert xtremote',
          'usermod -a -G ssl-cert,xtuser postgres',
        ],
        xtuple_users = [
          'useradd {xt.name} -d /usr/local/{xt.name} -p {sys.policy.userPassword}'.format(options),
          'usermod -a -G xtuser {xt.name}'.format(options),
          'chage -d 0 {xt.name}'.format(options)
        ],
        system_ownership = [
          'chown root:xtuser /etc/xtuple',
          'chown root:xtuser /etc/xtuple/*',
          'chown root:xtuser /var/lib/xtuple',
          'chown root:xtuser /usr/sbin/xtuple',
          'chown -R root:xtuser /usr/local/xtuple'
        ],
        system_mode = [
          'chmod g=rx,o-wr /etc/xtuple/',
          'chmod g=rx,o-wr /etc/xtuple/*',
          'chmod g=rwx,u=rx,o-wr /var/lib/xtuple',
          'chmod g=rwx,u=rx,o=rx /usr/sbin/xtuple',
          'chmod -R g=rx,u=rx,o=rx /usr/local/xtuple'
        ],
        user_ownership = [
          'chown {xt.name}:xtuser /var/lib/xtuple/{xt.version}/{xt.name}/'.format(options),
          'chown :xtuser /var/run/postgresql'.format(options),
          'chown {xt.name}:ssl-cert {xt.ssldir}'.format(options),
          'chown {xt.name}: {xt.configdir}'.format(options)
          //'chown {xt.name}:xtadmin {sys.sbindir}'.format(options)
        ],
        user_mode = [
          'chmod -R u=rwx,g-rwx /var/lib/xtuple/{xt.version}/{xt.name}'.format(options),
          'chmod -R g+wrx /var/run/postgresql'.format(options),
          'chmod -R g=rx,u=wrx,o-rwx {xt.ssldir}'.format(options),
          'chmod -R g=rwx,u=wrx,o-rw {xt.configdir}'.format(options),
          //'chmod -R g=rwx,u=rx,o-rw  {pg.configdir}'.format(options)
        ],
        system_users_results = _.map(system_users, exec),
        results = _.map(_.flatten([
          xtuple_users, system_ownership, system_mode, user_ownership, user_mode
        ]), exec),
        failed = _.difference(results, _.where(results, { code: 0 })),
        sudoers_chmod, visudo_cmd;

      if (failed.length > 0) {
        throw new Error(JSON.stringify(failed, null, 2));
      }

      // write sudoers file
      if (!fs.existsSync(global_policy_target)) {
        fs.writeFileSync(global_policy_target, global_policy_src);
      }
      if (!fs.existsSync(user_policy_target)) {
        fs.writeFileSync(user_policy_target, user_policy_src.format(options));
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

      // if customer appears new, that is they've provided no main database,
      // snapshot to restore from, or admin password, generate a admin password
      if (!options.xt.adminpw && !options.pg.restore && !options.xt.maindb) {
        options.xt.adminpw = policy.getPassword();
      }

      // set user shell
      exec('sudo chsh -s /bin/bash {xt.name}'.format(options));
    },

    /**
     * Configure SSH remote access rules.
     * @private
     */
    configureSSH: function  (options) {
      var src_sshd_conf = fs.readFileSync('/etc/ssh/sshd_config').toString(),
        rules = {
          UseDNS: 'no',
          PermitRootLogin: 'no',
          AllowGroups: 'xtadmin xtuser',
          LoginGraceTime: '30s',
          X11Forwarding: 'no',
          PubkeyAuthentication: 'no',
          HostbasedAuthentication: 'no'
        },
        target_sshd_conf = _.reduce(_.keys(rules), function (memo, key) {
          var regex = new RegExp('^' + key + '.*$', 'gm'),
            entry = key + ' ' + rules[key],
            match = regex.exec(memo);

          return match ? memo.replace(match, entry) : memo.concat(entry + '\n');
        }, src_sshd_conf);

      fs.writeFileSync('/etc/ssh/sshd_config.bak.' + new Date().valueOf(), src_sshd_conf);
      fs.writeFileSync('/etc/ssh/sshd_config', target_sshd_conf);
    },

    /** @override */
    uninstall: function (options) {
      exec('skill -KILL -u {xt.name}'.format(options));
      exec('deluser {xt.name}'.format(options));
      fs.unlinkSync(path.resolve('/etc/sudoers.d/', user_policy_filename.replace('user', '{xt.name}').format(options)));
      rimraf.sync(path.resolve(options.sys.userHomeDir));
    }
  });

})();
