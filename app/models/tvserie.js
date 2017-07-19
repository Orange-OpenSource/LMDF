'use strict';

const AudioVisualWork = require('./audiovisualwork');
//
// const Wikidata = require('../lib/wikidata');
// const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
// const Deezer = require('../lib/deezer');
// const Musicbrainz = require('../lib/musicbrainz');
// const ImgFetcher = require('lib/img_fetcher');
let TVSerie = null;

module.exports = TVSerie = AudioVisualWork.extend({
  docType: 'fr.orange.tvserie',
  save: function () {
    if (this.isNew()) {
      app.tvseries.add(this);
    }
    //eslint-disable-next-line
    AudioVisualWork.prototype.save.call(this, arguments);
  },
  // fetchPosterUri: function () {
  //   return this._runFetch(Wikidata.getPoster, 'posterUri');
  // },

  // fetchSoundtrack: function () {
  //   return this._runFetch(Musicbrainz.getSoundtrack, 'soundtrack', {
  //     isFieldReady: obj => obj.has('soundtrack') && obj.get('soundtrack').tracks
  //   });
  // },

  //
  // getPoster: function () {
  //   return (this.has('posterUri') ? Promise.resolve() : this.fetchPosterUri())
  //   .then(() => {
  //     const uri = this.get('posterUri');
  //     if (!uri) { return Promise.reject(); }
  //
  //     const path = decodeURIComponent(uri.replace(/.*org\//, ''));
  //     return ImgFetcher(uri, 'org.wikimedia.uploads', path);
  //   })
  //   .then(data => `data:image;base64,${data}`);
  // },
});

TVSerie.fromOrangeTitle = function (title) {
  console.warn('to override ?');

// Movie.fromOrangeTitle = function (title) {
//   const prepareTitle = (title) => {
//     return title.replace(' - HD', '')
//     .replace(/^BA - /, '')
//     .replace(/ - extrait exclusif offert$/, '')
//     .replace(/ - extrait offert$/, '')
//     .replace(/ - édition spéciale$/, '')
//     ;
//   };
//
//   return fromFrenchTitle(prepareTitle(title))
//   .catch((err) => {
//     console.warn(`Can't find movie: ${title} (err, see below). Create empty movie.`);
//     console.error(err);
//
//     return new Movie({ label: prepareTitle(title) });
//   })
//   .then((movie) => {
//     movie.set('orangeTitle', title);
//     return movie;
//   });
// };
};


// function fromFrenchTitle(title) {
//   return WikidataSuggestions.fetchMoviesSuggestions(title)
//   .then((suggestions) => {
//     if (!suggestions || suggestions.length === 0) {
//       return Promise.reject(`Can't find Movie with french title: ${title}`);
//     }
//
//     // TODO: improve the choice of the suggestion !
//     return Movie.fromWDSuggestionMovie(suggestions[0]);
//   });
// }
