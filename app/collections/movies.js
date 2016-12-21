'use strict'

var AsyncPromise = require('../lib/async_promise');
var WikidataSuggestions = require('../lib/wikidata_suggestions_film');
var Movie = require('../models/movie');


var bPromise = AsyncPromise.backbone2Promise;
var Movies = null;

module.exports = Movies = Backbone.Collection.extend({
  model: Movie,
  docType: new Movie().docType.toLowerCase(),
  comparator: (movie) => movie.getTitle(),

  sync: function(method, collection, options) {
    if (method !== 'read') {
      console.error('Only read is available on this collection.');
      if (options.error) {
        options.error('Only read is available on this collection.');
      }

      return;
    }

    var docType = new this.model().docType.toLowerCase();

    cozysdk.defineView(docType, 'all', 'function(doc) { emit(doc._id); }').then(
    cozysdk.run(docType, 'all', { include_docs: true }, function(err, results) {
      if (err) { return options.error(err); }

      return options.success(results.map(function(res) { return res.doc; }));
    }));
  },



  addVideoStreamToLibrary: function(videoStream) {
    return Promise.resolve().then(() => {
      let movie = this.find(movie => movie.get('orangeTitle') === videoStream.title);

      if (movie) {
        return movie;
      }
      return Movie.fromOrangeTitle(videoStream.title);
    }).then(
      movie => {

      movie.setViewed(videoStream);
      this.add(movie);

      return movie.save();
    }).catch(err => {
      console.error(err);
      return Promise.resolve();
    });
  },

  addFromVideoStreams: function(since) {
    return _getMovieVideoStream(since)
    .then(results => {
      let videoStreams = results.map(res => res.doc);
      return AsyncPromise.series(videoStreams, this.addVideoStreamToLibrary, this);
    });
  },
});


function _getMovieVideoStream(since) {
  const mapFun = function(doc) {
    if (doc.action == 'Visualisation'
      && doc.fromOffer !== 'AVSP TV LIVE' && doc.fromOffer !== 'OTV'
      && !(doc.subTitle && doc.subTitle !== '')) {
        emit(doc.timestamp);
      }
  };

  return cozysdk.defineView('videostream', 'moviesByDate', mapFun.toString())
  .then(function() {
    return cozysdk.run('videostream', 'moviesByDate',
        { startkey: "2016-09-07T00:47:20Z", limit: 3, include_docs: true });
  });
};


