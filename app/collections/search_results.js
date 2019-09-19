/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


'use strict';

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
      return funpromise.series(suggestions, this.fromWDSuggestionMovie.bind(this));
    }).catch(err => console.error(err)) // Fail silently.
    .then(() => this.trigger('done'));
  },
});
