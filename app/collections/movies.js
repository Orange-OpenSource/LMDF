'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');

const Movie = require('../models/movie');

module.exports = CozyCollection.extend({
  model: Movie,
  modelId: attrs => (attrs.wikidataId ? attrs.wikidataId : attrs.label),
  comparator: 'label',
});
