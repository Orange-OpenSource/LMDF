'use strict';

const CozyModel = require('../lib/backbone_cozymodel');
const Wikidata = require('../lib/wikidata');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
const Deezer = require('../lib/deezer');
const Musicbrainz = require('../lib/musicbrainz');


let Movie = null;

module.exports = Movie = CozyModel.extend({
  docType: 'movie',

  setViewed: function (videoStream) {
    const viewed = this.get('viewed') || [];

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

  _fetchMusic: function() {
    const attrs = this.attributes;
    return Musicbrainz.getSoundtrack(attrs)
    // .then(Deezer.getSoundtracks)
    .then(() => {
      console.log('after getSoundtracks');
      console.log(attrs);
      this.set(attrs);
      return attrs.soundtrack;
    });
  },

  getSoundtrack: function() {
    const soundtrack = this.get('soundtrack');
    return Promise.resolve(
      soundtrack.tracks ? soundtrack : this._fetchMusic());
  },

  getDeezerIds: function() {
    const soundtrack = this.get('soundtrack');
    if (soundtrack) {
      // TODO: handle only the first one now.
      return Deezer.getTracksId(soundtrack)
      .then((changes) => {
        if (changes && changes.length > 0) {
          this.set('soundtrack', soundtrack);
          // return this.save();
        }
      })
      .then(() => {
        return soundtrack.tracks.map(track => track.deezerId);
      });
    } else {
      return Promise.resolve([]);
    }
  },
});

Movie.fromWDSuggestionMovie = function (wdSuggestion) {
  return Wikidata.getMovieById(wdSuggestion.id)
  .then(attrs => new Movie(attrs))
  ;
};

Movie.fromOrangeTitle = function (title) {
  const prepareTitle = (title) => {
    return title.replace(' - HD', '')
    .replace(/^BA - /, '')
    .replace(/ - extrait exclusif offert$/, '')
    .replace(/ - extrait offert$/, '')
    .replace(/ - édition spéciale$/, '')
    ;
  };

  return fromFrenchTitle(prepareTitle(title))
  .then((movie) => {
    movie.set('orangeTitle', title);
    return movie;
  });
};

function fromFrenchTitle(title) {
  return WikidataSuggestions.fetchMoviesSuggestions(title)
  .then((suggestions) => {
    if (!suggestions || suggestions.length === 0) {
      return Promise.reject(`Can't find Movie with french title: ${title}`);
    }

    // TODO: improve the choice of the suggestion !
    return Movie.fromWDSuggestionMovie(suggestions[0]);
  });
}
