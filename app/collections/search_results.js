'use strict'

const AsyncPromise = require('../lib/async_promise');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');

const Movie = require('../models/movie');


module.exports =
Backbone.Collection.extend({
  model: Movie,

  findByWDId: function(wdId) {
    return this.findWhere({ wikidataId: wdId });
  },

  fromWDSuggestionMovie: function(wdSuggestion) {
    let movie = this.findByWDId(wdSuggestion.id);
    if (movie) {
      return Promise.resolve(movie);
    }

    return Movie.fromWDSuggestionMovie(wdSuggestion)
    .then(movie => {
      console.log(this);
      this.add(movie);
      return movie;
    });
  },

  // TODO: duplicate form models/movie/fromFrenchTitle .
  fromKeyword: function(keyword) {
    // fetch suggestions.

    // generate movie models.
    return WikidataSuggestions.fetchMoviesSuggestions(keyword)
    .then((suggestions) => {
      console.log(suggestions);
      return AsyncPromise.series(suggestions, this.fromWDSuggestionMovie, this)
    });
  },

});

