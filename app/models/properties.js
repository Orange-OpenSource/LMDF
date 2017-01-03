'use-strict';

const CozySingleton = require('../lib/backbone_cozysingleton');

const Properties = CozySingleton.extend({
  docType: 'LaMusiqueDeMesFilmsProperties'.toLowerCase(),
  // TODO: handle since parameter.
});

module.exports = new Properties();
