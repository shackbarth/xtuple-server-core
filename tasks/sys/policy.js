(function () {
  'use strict';

  /**
   * Setup machine access policies.
   * + = group
   * - = user
   *
   *  + sudo
   *    - xtadmin
   *  + xtadmin
   *    - xtremote
   *    - xtuple
   *  + xtuser
   *    - <customer>
   *    - <customer>
   */
  var policy = exports;

  var task = require('../../lib/task'),
    log = require('npmlog'),
    fs = require('fs'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('underscore'),
    global_policy_filename = 'XT00-xtuple-global-policy',
    user_policy_filename = 'XT10-xtuple-user-policy',
    sudoers_d = path.resolve('/etc/sudoers.d');

  _.extend(policy, task, /** @exports policy */ {

    beforeTask: function (options) {
      var path_suffix = '{xt.version}/{xt.name}/'.format(options);

      options.sys.sbindir = path.resolve('/usr/sbin/xtuple', path_suffix);
      options.xt.homedir = path.resolve('/usr/local/xtuple');
    },

    /** @override */
    doTask: function (options) {
      policy.createUsers(options);
      policy.configureSSH(options);
    },

    /** @override */
    afterInstall: function (options) {
      exec('rm -f ~/.pgpass');
    },

    /** @override */
    afterTask: function (options) {
      exec('service ssh reload');
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
          user_policy_filename.replace('user', '{name}').format(xt)
        ),
        passwords = _.map(_.range(100), function (i) {
          return exec('openssl rand 6 | base64').stdout;
        }),
        xtuple_path_suffix = '{xt.version}/{xt.name}/'.format(options),
        postgres_path_suffix = '{pg.version}/{xt.name}/'.format(options),
        set_passwd = 'echo "{name}:{password}" | chpasswd',
        expire_passwd = 'chage -d 0 {name}',
        system_users = [
          'addgroup xtuser',
          'addgroup xtadmin',
          'adduser xtremote --ingroup xtadmin --disabled-login',
          'adduser xtadmin --disabled-login',
          'usermod -a -G xtadmin,xtuser,www-data,postgres,lpadmin,ssl-cert xtremote',
          'usermod -a -G ssl-cert,xtuser postgres'
        ],
        xtuple_users = [
          'adduser {xt.name} --disabled-login --gecos "" '.format(options),
          'usermod -a -G xtuser {xt.name}'.format(options),
        ],
        system_ownership = [
          'chown root:xtuser /etc/xtuple',
          'chown root:xtuser /etc/xtuple/*',
          'chown root:xtuser /var/lib/xtuple',
          'chown {xt.name}:xtuser /var/lib/xtuple/{xt.version}/{xt.name}/'.format(options),
          'chown root:xtuser /usr/sbin/xtuple',
          'chown root:xtuser /usr/local/xtuple'
        ],
        system_mode = [
          'chmod g+rx,o-wr /etc/xtuple/',
          'chmod g+rx,o-wr /etc/xtuple/*',
          'chmod g+rwx,u=rx,o-wr /var/lib/xtuple',
          'chmod u=rwx /var/lib/xtuple/{xt.version}/{xt.name}'.format(options),
          'chmod g+rwx,u=rx,o-wr /usr/sbin/xtuple',
          'chmod g+rwx,u=rx,o-wr /usr/local/xtuple'
        ],
        user_ownership = [
          'chown :xtuser /var/run/postgresql'.format(options),
          'chown -R {xt.name}:ssl-cert {xt.ssldir}'.format(options),
          'chown -R {xt.name}: {xt.configdir}'.format(options)
          //'chown {xt.name}:xtadmin {sys.sbindir}'.format(options)
        ],
        user_mode = [
          'chmod -R g=wrx,u=wrx,o=wrx /var/run/postgresql'.format(options),
          'chmod -R g=rx,u=wrx,o-rwx {xt.ssldir}'.format(options),
          'chmod -R g=rwx,u=wrx,o-rw  {xt.configdir}'.format(options)
          //'chmod -R g=rwx,u=rx,o-rw  {pg.configdir}'.format(options)
        ],
        system_users_results = _.map(system_users, exec),
        xtuple_users_reslts = _.map(xtuple_users, exec),
        results = _.map(_.flatten([
          system_ownership, system_mode, user_ownership, user_mode
        ]), exec),
        failed = _.difference(results, _.where(results, { code: 0 }));

      if (failed.length > 0) {
        throw new Error(JSON.stringify(failed, null, 2));
      }

      if (exec('id xtremote').code !== 0) {
        exec(set_passwd.format({ password: passwords.pop(), name: 'xtremote' }));
      }
      if (exec('id ' + xt.name).code !== 0) {
        exec(set_passwd.format({ password: passwords.pop(), name: xt.name }));
      }

      // write sudoers file
      if (!fs.existsSync(global_policy_target)) {
        fs.writeFileSync(global_policy_target, global_policy_src);
      }
      if (!fs.existsSync(user_policy_target)) {
        fs.writeFileSync(user_policy_target, user_policy_src.format(xt));
      }

      exec('chmod 440 /etc/sudoers.d/*');

      results = exec('visudo -c');

      if (results.code !== 0) {
        throw new Error(JSON.stringify(results, null, 2));
      }
    },

    /**
     * Configure SSH remote access rules.
     * @private
     */
    configureSSH: function  (options) {
      var src_sshd_conf = fs.readFileSync('/etc/ssh/sshd_config'),
        rules = {
          UseDNS: 'no',
          PermitRootLogin: 'no',
          AllowGroups: 'xtadmin xtuser',
          LoginGraceTime: '30s',
          X11Forwarding: 'no',
          PubkeyAuthentication: 'no'
        },
        target_sshd_conf = _.reduce(_.keys(rules), function (memo, key) {
          var regex = new RegExp('^' + key + '.*$'),
            entry = key + ' ' + rules[key];
          return regex.test(memo) ? memo.concat(entry) : memo.replace(regex, entry);
        }, src_sshd_conf);

      // make backup
      fs.writeFileSync('/etc/ssh/sshd_config.bak.' + new Date().valueOf(), src_sshd_conf);
      fs.writeFileSync('/etc/ssh/sshd_config', target_sshd_conf);
    }
  });

})();
