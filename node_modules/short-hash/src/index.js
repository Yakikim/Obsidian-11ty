'use strict';
var hash = require('hash-string');

module.exports = function shortHash(str) {
  return hash(str).toString(16);
};
