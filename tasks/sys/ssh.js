(function () {
  'use strict';

  /**
   * Configure ssh access policy
   */
  var ssh = exports;

  var lib = require('../../lib'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    exec = require('execSync').exec,
    path = require('path'),
    _ = require('lodash');

  _.extend(ssh, lib.task, /** @exports policy */ {

    /** @override */
    executeTask: function (options) {
      var me = exec('logname').stdout;

      exec('usermod -a -G xtuser '+ me);
      exec('usermod -a -G xtadmin '+ me);

      if (exec('id -u xtremote'.format(options)).code !== 0) {
        ssh.configure(options);
      }
    },

    /**
     * Configure SSH remote access rules.
     * @private
     */
    configure: function  (options) {
      var src_sshd_conf = fs.readFileSync('/etc/ssh/sshd_config').toString(),
        rules = {
          UseDNS: 'no',
          PermitRootLogin: 'no',
          //AllowGroups: 'xtadmin xtuser', // TODO solve riskiness of installing over ssh
          LoginGraceTime: '30s',
          ClientAliveInterval: '60',
          ClientAliveCountMax: '60',  // keep session alive for one hour
          PasswordAuthentication: 'yes',
          //X11Forwarding: 'no',
          //PubkeyAuthentication: 'no',
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
    }
  });

})();
