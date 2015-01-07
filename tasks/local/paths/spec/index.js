global.log  = require('npmlog');
log.heading = 'xtuple-server-local-paths';
log.level   = 'verbose';

var assert = require('assert'),
    fs     = require('fs'),
    paths  = require('..');

describe('local-paths', function () {
  it('should fail to find xtuple in a bad dir', function () {
    var result, err;
    try       { result = paths.options.workspace.validate('xtupleee'); }
    catch (e) { err = e; }
    assert.ok(!result);
    assert.ok(err);
    assert.ok(/xtuple.git/.test(err.toString()));
  });
  it('should fail to find xtuple in /tmp', function () {
    var result, err;
    try {
      if (fs.existsSync('/tmp/xtuple/package.json')) {
        log.warn('validate', 'cannot test /tmp/xtuple failure');
        return;
      }
    } catch(e) { if (! /ENOENT/.test(e)) throw e; }
    try       { result = paths.options.workspace.validate('/tmp/xtuple'); }
    catch (e) { err = e; }
    log.verbose('validate', result);
    assert.ok(!result);
    assert.ok(err);
    assert.ok(/xtuple.git/.test(err.toString()));
  });
  it('should find a specially-created xtuple in /tmp', function () {
    var fd,
        contents = '{ "name": "xtuple" }';
    if (fs.existsSync('/tmp/xtuple/package.json')) {
      log.warn('validate', 'cannot create dummy validation file');
      return;
    }
    // first create the file
    if (! fs.existsSync('/tmp/xtuple')) fs.mkdirSync('/tmp/xtuple');
    fs.writeFileSync('/tmp/xtuple/package.json', contents);

    // now the test
    result = paths.options.workspace.validate('/tmp/xtuple');
    assert.equal(result, '/tmp/xtuple');
  });

  after(function() {
    try { fs.unlinkSync('/tmp/xtuple/package.json'); } catch (e) {};
    try { fs.rmdirSync('/tmp/xtuple');               } catch (e) {};
  });
});
