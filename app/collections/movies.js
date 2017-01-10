'use strict';

const AsyncPromise = require('../lib/async_promise');
const Movie = require('../models/movie');

module.exports = Backbone.Collection.extend({
  model: Movie,
  docType: Movie.prototype.docType.toLowerCase(),
  modelId: attrs => attrs.wikidataId,
  comparator: movie => movie.getTitle(),

  sync: function (method, collection, options) {
    if (method !== 'read') {
      console.error('Only read is available on this collection.');
      if (options.error) {
        options.error('Only read is available on this collection.');
      }
      return;
    }
    cozysdk.run(this.docType, 'all', { include_docs: true }, (err, results) => {
      if (err) { return options.error(err); }

      return options.success(results.map(res => res.doc));
    });
  },


  addVideoStreamToLibrary: function (videoStream) {
    return Promise.resolve().then(() => {
      const movie = this.find(movie => movie.get('orangeTitle') === videoStream.content.title);

      if (movie) {
        return movie;
      }
      return Movie.fromOrangeTitle(videoStream.content.title);
    }).then((movie) => {
      movie.setViewed(videoStream);
      this.add(movie);

      return movie.save();
    }).catch((err) => {
      // Fail silenlty.
      console.error(err);
      return Promise.resolve();
    });
  },


  addFromVideoStreams: function () {
    const since = app.properties.get('lastVideoStream') || '';
    let last = since;
    return cozysdk.run('videostream', 'moviesByDate',
    { startkey: since, include_docs: true }) // TODO : remove limit !
    .then((results) => {
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult.key > since) {
        last = lastResult.key;
      }

      const videoStreams = results.map(res => res.doc);
      return AsyncPromise.series(videoStreams, this.addVideoStreamToLibrary, this);
    })
    .then(() => {
      app.properties.set('lastVideoStream', last);
      return app.properties.save();
    });
  },


  defineMovieAllView: function () {
    return cozysdk.defineView(this.docType, 'all', 'function(doc) { emit(doc._id); }');
  },


  defineVideoStreamMoviesByDateView: function () {
    const mapFun = function (doc) {
      if (doc.action === 'Visualisation'
        && doc.details.offerName !== 'AVSP TV LIVE' && doc.details.offerName !== 'OTV'
        && !(doc.content.subTitle && doc.content.subTitle !== '')) {
        emit(doc.timestamp);
      }
    };
    return cozysdk.defineView('videostream', 'moviesByDate', mapFun.toString());
  },
});
