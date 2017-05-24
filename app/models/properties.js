'use-strict';

const CozySingleton = require('../lib/backbone_cozysingleton');

const Properties = CozySingleton.extend({
  docType: 'fr.orange.lamusiquedemesfilms.properties'
});

module.exports = new Properties();
