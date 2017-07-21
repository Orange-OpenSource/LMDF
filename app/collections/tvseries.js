'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');
const Model = require('../models/tvserie');

module.exports = CozyCollection.extend({
  model: Model,
  modelId: attrs => (attrs.wikidataId ? attrs.wikidataId : attrs.label),
  comparator: 'label',
});
