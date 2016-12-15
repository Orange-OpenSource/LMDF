var appName = require('../lib/appname_version');
var Wikidata = require('../lib/wikidata');
var Musicbrainz = require('../lib/musicbrainz');

var Movie = null;

module.exports = Movie = Backbone.Model.extend({
  docType: 'Movie'.toLowerCase(),
  defaults: {
    docTypeVersion: appName,
  },
});

Movie.fromWDSuggestionMovie = function(wdSuggestion) {
  return Wikidata.getMovieById(wdSuggestion.id)
    .then(Musicbrainz.getSoundtracks);
};
