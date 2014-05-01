/**
 * Configure and manage postgres.
 *
 * XXX I accidentally named this module 'pg'. Why is that a problem?
 * Because there is already a pg module. So if you accidentally require('pg')
 * instead of require('../pg') then your life will become very confusing and
 * sad.
 * TODO change name
 */
module.exports = require('requireindex')(__dirname);
