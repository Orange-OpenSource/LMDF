'use strict';

const CozyModel = require('../lib/backbone_cozymodel');
const AudioVisualWork = require('../models/audiovisualwork');
// const Wikidata = require('../lib/wikidata');
// const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
// const Deezer = require('../lib/deezer');
// const Musicbrainz = require('../lib/musicbrainz');
// const ImgFetcher = require('lib/img_fetcher');

module.exports = CozyModel.extend({
  docType: 'fr.orange.videostream',

  getAudioVisualWork: function () {
    if (!this.audioVisualWork) {
      const findVideoStream = (movie) => {
        return movie.has('viewed') && _.findWhere(movie.get('viewed'), { videoStreamId: this.get('_id') });
      };
      this.audioVisualWork = app.movies.find(findVideoStream)
        || app.tvseries.find(findVideoStream)
        || null;
              // this.audiovisualWork = app.movies.at(Math.ceil(Math.random() * 50));
    }
    return this.audioVisualWork;
  },

  getName: function () {
    const content = this.get('content');
    if (!content) { return name; }

    // Movies
    if (this.get('action') === 'Visualisation'
     && this.get('details') && this.get('details').offerName !== 'AVSP TV LIVE'
     && this.get('details').offerName !== 'OTV' && !content.subTitle) {
      return content.title.replace(' - HD', '')
        .replace(/^BA - /, '')
        .replace(/ - extrait exclusif offert$/, '')
        .replace(/ - extrait offert$/, '')
        .replace(/ - édition spéciale$/, '')
        ;
    }

    // series
    // look in subtitle, remove %d - in front, and  - S%d%d at the end.
    if (!content.subTitle) { return ''; }

    return content.subTitle.replace(/^\d+[ ]*-[ ]*/, '')
      .replace(/[ ]*-?[ ]+S\d+$/, '')
      .replace(/[ ]*-[ ]*VOST$/, '')
      .replace(/&/g, ' ')
      ;
  },

  findAudioVisualWork: function () {
    const name = this.getName();
    if (!name) { return Promise.reject('neither a film nor tvserie'); } // TODO

    const avw = app.movies.findWhere({ orangeName: name }) || app.tvseries.findWhere({ orangeName: name });
    if (avw) { return Promise.resolve(avw); }

    return new Promise(resolve => app.bloodhound.search(name, resolve))
    // WikidataSuggestions.fetchMoviesSuggestions(name)
    .then(suggestions => AudioVisualWork.fromWDSuggestion(suggestions[0]));
  },
});


// TVShow.fromWDSuggestionMovie = function (wdSuggestion) {
//   return Wikidata.getMovieData(wdSuggestion.id)
//   .then(attrs => new TV(attrs))
//   ;
// };

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
