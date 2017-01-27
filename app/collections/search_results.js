'use strict';

const AsyncPromise = require('../lib/async_promise');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
const Movie = require('../models/movie');


module.exports =
Backbone.Collection.extend({
  model: Movie,
  modelId: attrs => attrs.wikidataId,

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
      if (err.message === 'this ID is not a movie') {
        // Fail silently and quitely
        console.info(`Cette entité ${wdSuggestion.id} n'est pas un film.`);
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
    }).catch(err => console.error(err)); // Fail silently.
  },
});
