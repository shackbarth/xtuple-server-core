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

    /** @override */
    doTask: function (options) {
      var xt = options.xt;

      createUsers(options);
      configureSSH(options);

      return { };
    },

    /** @override */
    doFinish: function (options) {
      exec('rm -f ~/.pgpass');
    },

    /** @override */
    afterTask: function (options) {
      exec('service ssh reload');
    }
  });

  /**
   * Create users and set permissions
   * @private
   */
  function createUsers (options) {
    var xt = options.xt,
      global_policy_src = fs.readFileSync(path.resolve(__dirname, global_policy_filename)),
      global_policy_target = path.resolve(sudoers_d, global_policy_filename),
      user_policy_src = fs.readFileSync(path.resolve(__dirname, user_policy_filename)),
      user_policy_target = path.resolve(
        sudoers_d,
        user_policy_filename.replace('user', '{name}').format(xt)
      ),
      passwords = _.map(_.range(100), function (i) {
        return exec('openssl rand 6 | base64').stdout;
      }),
      xtuple_path_suffix = '{xt.version}/{xt.name}/'.format(options),
      postgres_path_suffix = '{pg.version}/{xt.name}/'.format(options),
      set_passwd = 'echo {password} | passwd {name} --stdin',
      expire_passwd = 'chage -d 0 {name}',
      system_users = [
        'addgroup xtuser',
        'addgroup xtadmin',
        'adduser xtdaemon --system',
        'adduser xtremote --ingroup xtadmin --disabled-login',
        'adduser xtadmin --disabled-login',
        'usermod -a -G sudo xtdaemon',
        'usermod -a -G xtadmin,www-data,postgres,lpadmin xtremote',
      ],
      xtuple_users = [
        'adduser {name} --ingroup xtuser --disabled-login'.format(xt),
        'usermod -a -G xtadmin {name}'.format(xt),
      ],
      system_ownership = [
        'chown -R root:ssl-cert /etc/ssl/private',
        'chown -R root:xtadmin /etc/xtuple',
        'chown -R root:xtadmin /var/lib/xtuple',
        'chown -R root:xtadmin /usr/sbin/xtuple',
        'chown -R root:xtadmin /usr/local/xtuple'
      ],
      user_ownership = [
        'chown -R {name}:xtuser ' + path.resolve('/etc/xtuple/', xt.version, xt.name),
        'chown -R {name}:xtuser ' + path.resolve('/usr/sbin/xtuple/', xt.version, xt.name)
      ],
      system_mode = [
        'chmod -R g+rwx,u=rx,o-wr /etc/xtuple/',
        'chmod -R g+rwx,u=rx,o-wr /var/lib/xtuple',
        'chmod -R g+rwx,u=rx,o-wr /usr/sbin/xtuple',
        'chmod -R g+rwx,u=rx,o-wr /usr/local/xtuple'
      ],
      user_mode = [
        'chmod -R g+rwx,u=rx,o-wr ' + path.resolve('/etc/xtuple', xtuple_path_suffix),
        'chmod -R g+rwx,u=rx,o-wr ' + path.resolve('/etc/postgresql', postgres_path_suffix)
      ];

    // create system users and set ownership and permissions
    if (exec('id xtremote').code !== 0) {
      _.each(system_users, exec);
      _.each(system_ownership, exec);
      _.each(system_mode, exec);
      exec(set_passwd.format({ password: passwords.pop(), name: 'xtremote' }));
    }

    // create xtuple users and set ownership and permissions
    if (exec('id ' + xt.name).code !== 0) {
      _.each(xtuple_users, exec);
      _.each(user_ownership, exec);
      _.each(user_mode, exec);
      exec(set_passwd.format({ password: passwords.pop(), name: xt.name }));
    }

    // write sudoers file
    if (!fs.existsSync(global_policy_target)) {
      fs.writeSync(global_policy_target, global_policy_src);
    }
    if (!fs.existsSync(user_policy_target)) {
      fs.writeSync(user_policy_target, user_policy_src.format(xt));
    }
  }

  /**
   * Configure SSH remote access rules.
   * @private
   */
  function configureSSH (options) {
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

})();
