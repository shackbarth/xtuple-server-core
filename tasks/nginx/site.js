(function () {
  'use strict';

  /**
   * Create a new nginx site
   */
  var site = exports;

  var lib = require('../../lib'),
    os = require('os'),
    exec = require('execSync').exec,
    format = require('string-format'),
    fs = require('fs'),
    path = require('path'),
    _ = require('lodash');
    
  _.extend(site, lib.task, /** @exports site */ {

    options: {
      domain: {
        optional: '[domain]',
        description: 'The public domain name that will point to this web server',
        value: 'localhost'
      },
      safeport: {
        optional: '[boolean]',
        description: 'Use non-root nginx http port',
        value: false
      }
    },

    /**
     * Generate 'sitename' value and format the domain argument if necessary
     * @override
     */
    beforeInstall: function (options) {
      options.nginx.sitename = 'xt-{version}-{name}'.format({
        name: options.xt.name,
        version: site.getScalarVersion(options)
      });
      options.nginx.hostname = '{nginx.sitename}.localhost'.format(options);
      options.nginx.sitesAvailable = path.resolve('/etc/nginx/sites-available');
      options.nginx.sitesEnabled = path.resolve('/etc/nginx/sites-enabled');
      options.nginx.availableSite = path.resolve(options.nginx.sitesAvailable, options.nginx.sitename);
      options.nginx.enabledSite = path.resolve(options.nginx.sitesEnabled, options.nginx.sitename);

      options.nginx.httpport = 80;
      options.nginx.httpsport = 443;

      if (options.nginx.safeport) {
        options.nginx.httpport += 32768;
        options.nginx.httpsport += 32768;
      }

      // nginx site template file path
      options.nginx.siteTemplateFile = path.resolve(__dirname, 'xtuple-site.template');

      if (fs.existsSync(options.nginx.siteConfig)) {
        throw new Error('nginx site already exists for this account: '+ options.nginx.siteConfig);
      }

      if (options.nginx.domain === 'localhost') {
        options.nginx.domain = options.nginx.hostname;
      }
      options.nginx.healthfeedurl = '{nginx.domain}/_healthfeed'.format(options);
      options.nginx.lanEndpoints = (options.pg && options.pg.mode === 'dedicated') && [
        '       (^10\\.)',
        '       (^172\\.1[6-9]\\.)',
        '       (^172\\.2[0-9]\\.)',
        '       (^172\\.3[0-1]\\.)',
        '       (^192\\.168\\.)'
      ].join('\n') || '';
    },

    /** @override */
    beforeTask: function (options) {
      options.nginx.port = require('../xt').serverconfig.getServerSSLPort(options);
      options.nginx.healthfeedport = options.nginx.port + 5984;

      exec('rm -f '+ path.resolve(options.nginx.sitesEnabled, 'default'));
    },

    /**
     * Generate and write nginx conf
     *  - proxy requests to the node server
     *  - auto-redirect http -> https
     *  - set up SSL
     *  @override
     */
    executeTask: function (options) {
      site.writeSiteConfig(options);
    },

    /** @override */
    afterTask: function (options) {
      var reload = exec('service nginx reload');

      if (reload.code !== 0) {
        throw new Error('nginx failed to reload: ' + reload.stdout);
      }
    },

    writeSiteConfig: function (options) {
      // write nginx site config file
      fs.writeFileSync(
        options.nginx.availableSite,
        fs.readFileSync(options.nginx.siteTemplateFile).toString().format(options).trim()
      );

      exec('ln -s {nginx.availableSite} {nginx.enabledSite}'.format(options));
    },

    /** @override */
    uninstall: function (options) {
      fs.unlinkSync(options.nginx.enabledSite);
      fs.unlinkSync(options.nginx.availableSite);
      exec('service nginx reload');
    },

    /**
     * Return a version with no dots, which makes more sense when used in a URL
     * or a database name than having punctuation.
     */
    getScalarVersion: function (options) {
      return String(options.xt.version).replace(/\./g, '');
    }
  });

})();
