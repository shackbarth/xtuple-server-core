var lib = require('xtuple-server-lib'),
  exec = require('sync-exec'),
  _ = require('lodash'),
  format = require('string-format'),
  fs = require('fs'),
  path = require('path');
  
/**
 * Create a new nginx site
 */
_.extend(exports, lib.task, /** @exports xtuple-server-nginx-site */ {

  options: {
    domain: {
      optional: '[domain]',
      description: 'The public domain name that will point to this web server',
      value: 'localhost'
    },
    lan: {
      optional: '[boolean]',
      description: 'Web server will listen on LAN ip addresses',
      value: false
    }
  },

  /**
   * Generate 'sitename' value and format the domain argument if necessary
   * @override
   */
  beforeInstall: function (options) {
    options.nginx.sitename = lib.util.$(options);
    options.nginx.hostname = options.nginx.sitename + '.localhost';
    options.nginx.sitesAvailable = path.resolve('/etc/nginx/sites-available');
    options.nginx.sitesEnabled = path.resolve('/etc/nginx/sites-enabled');
    options.nginx.availableSite = path.resolve(options.nginx.sitesAvailable, options.nginx.sitename);
    options.nginx.enabledSite = path.resolve(options.nginx.sitesEnabled, options.nginx.sitename);

    options.nginx.httpport = 80;
    options.nginx.httpsport = 443;
    options.nginx.safeport = options.nginx.httpsport + 32768;

    // nginx site template file path
    options.nginx.siteTemplateFile = path.resolve(__dirname, 'xtuple-site.template');

    if (fs.existsSync(options.nginx.siteConfig)) {
      throw new Error('nginx site already exists for this account: '+ options.nginx.siteConfig);
    }

    if (options.nginx.domain === 'localhost') {
      options.nginx.domain = options.nginx.hostname;
    }
    options.nginx.lanEndpoints = options.nginx.lan ? [
      '       (^10\\.)',
      '       (^172\\.1[6-9]\\.)',
      '       (^172\\.2[0-9]\\.)',
      '       (^172\\.3[0-1]\\.)',
      '       (^192\\.168\\.)'
    ].join('\n') : '';
  },

  /** @override */
  beforeTask: function (options) {
    options.nginx.port = lib.util.getServerSSLPort(options);
  },

  /**
   * Generate and write nginx conf
   *  - proxy requests to the node server
   *  - auto-redirect http -> https
   *  - set up SSL
   *  @override
   */
  executeTask: function (options) {
    exports.writeSiteConfig(options);
  },

  /** @override */
  afterTask: function (options) {
    if (fs.existsSync('/etc/nginx/sites-enabled/default')) {
      fs.unlinkSync('/etc/nginx/sites-enabled/default');
    }
    var reload = exec('service nginx reload');

    if (reload.status !== 0) {
      throw new Error('nginx failed to reload: ' + reload.stdout);
    }
  },

  writeSiteConfig: function (options) {
    // write nginx site config file
    fs.writeFileSync(
      options.nginx.availableSite,
      fs.readFileSync(options.nginx.siteTemplateFile).toString().format(options).trim()
    );

    exec([ 'ln -s', options.nginx.availableSite, options.nginx.enabledSite ].join(' '));
  },

  /** @override */
  uninstall: function (options) {
    if (fs.existsSync(options.nginx.enabledSite)) {
      fs.unlinkSync(options.nginx.enabledSite);
      fs.unlinkSync(options.nginx.availableSite);

      exec('service nginx reload');
    }
  }
});
