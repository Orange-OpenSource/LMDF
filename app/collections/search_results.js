'use strict';

const AsyncPromise = require('../lib/async_promise');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
const Movie = require('../models/movie');


module.exports =
Backbone.Collection.extend({
  model: Movie,

  findByWDId: function (wdId) {
    return this.findWhere({ wikidataId: wdId });
  },

  fromWDSuggestionMovie: function (wdSuggestion) {
    const movie = this.findByWDId(wdSuggestion.id);
    if (movie) {
      return Promise.resolve(movie);
    }

    return Movie.fromWDSuggestionMovie(wdSuggestion)
    .then((movie) => {
      this.add(movie);
      return movie;
    }).catch((err) => {
      const msg = `Erreur à la récupération des données pour le film ${wdSuggestion.id}`;
      console.error(msg);
      console.error(err);
      // Fail silently
    });
  },


  fromKeyword: function (keyword) {
    return WikidataSuggestions.fetchMoviesSuggestions(keyword)
    .then((suggestions) => {
      AsyncPromise.series(suggestions, this.fromWDSuggestionMovie, this);
    }).catch(err => console.error(err)); // Fail silently.
  },
});
