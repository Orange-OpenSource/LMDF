'use strict';

const AsyncPromise = require('../lib/async_promise');
const WikidataSuggestions = require('../lib/wikidata_suggestions');
const Model = require('../models/audiovisualwork');

module.exports = Backbone.Collection.extend({
  model: Model,
  modelId: attrs => attrs.wikidataId,

  findByWDId: function (wdId) {
    return this.findWhere({ wikidataId: wdId });
  },

  fromWDSuggestionMovie: function (wdSuggestion) {
    const avw = this.findByWDId(wdSuggestion.id);
    if (avw) {
      return Promise.resolve(avw);
    }

    return Model.fromWDSuggestion(wdSuggestion)
    .then((avw) => {
      this.add(avw);
      return avw;
    }).catch((err) => {
      const msg = `Erreur à la récupération des données pour le programme ${wdSuggestion.id}`;
      if (err.message === 'this ID is neither a movie nor a tv serie') {
        // Fail silently and quitely
        console.info(`Cette entité ${wdSuggestion.id} n'est pas ni un film, ni un série.`);
      } else {
        // Fail silently
        console.error(msg);
        console.error(err);
      }
    });
  },

  fromKeyword: function (keyword) {
    return WikidataSuggestions.fetchMoviesSuggestions(keyword)
    .then((suggestions) => {
      return AsyncPromise.series(suggestions, this.fromWDSuggestionMovie, this);
    }).catch(err => console.error(err)) // Fail silently.
    .then(() => this.trigger('done'));
  },
});
