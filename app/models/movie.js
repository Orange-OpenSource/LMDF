
'use strict'

var CozyModel = require('../lib/backbone_cozymodel');
var Wikidata = require('../lib/wikidata');
var Musicbrainz = require('../lib/musicbrainz');
var WikidataSuggestions = require('../lib/wikidata_suggestions_film');
var Deezer = require('../lib/deezer');

var Movie = null;

module.exports = Movie = CozyModel.extend({
  docType: 'Movie'.toLowerCase(),

  getTitle: function() {
    // TODO: l10n
    const locale = 'fr';
    return this.label;
  },

  setViewed: function(videoStream) {
    let viewed = this.get('viewed') || [];

    if (viewed.some(view => view.timestamp === videoStream.timestamp)) {
      return;
    }

    viewed.push({
      timestamp: videoStream.timestamp,
      videoStreamId: videoStream._id,
      accountType: 'orange',
    });
    this.set('viewed', viewed);
  },
});

Movie.fromWDSuggestionMovie = function(wdSuggestion) {
  return Wikidata.getMovieById(wdSuggestion.id)
    //.then(Musicbrainz.getSoundtracks)
    .then(Deezer.getSoundtracks)
    .then(function(attrs) {
      return new Movie(attrs);
    });
};

Movie.fromOrangeTitle = function(title) {
  let prepareTitle = function(title) {
    return title.replace(' - HD', '')
      .replace(/^BA - /, '')
      .replace(/ - extrait exclusif offert$/, '')
      .replace(/ - extrait offert$/, '')
      .replace(/ - édition spéciale$/, '')
      ;
  };

  return fromFrenchTitle(prepareTitle(title))
  .then(function(movie) {
      movie.set('orangeTitle', title);
      return movie;
  });
};

function fromFrenchTitle(title) {
  return WikidataSuggestions.fetchMoviesSuggestions(title)
  .then(function(suggestions) {
    console.log(suggestions);
    if (!suggestions || suggestions.length === 0) {
      return Promise.reject("can't find Movie");
    }

    // TODO: improve !!
    return Movie.fromWDSuggestionMovie(suggestions[0])
  });
};
