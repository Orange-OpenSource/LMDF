'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');

const AsyncPromise = require('../lib/async_promise');
const Movie = require('../models/movie');


module.exports = CozyCollection.extend({
  model: Movie,
  modelId: attrs => (attrs.wikidataId ? attrs.wikidataId : attrs.label),
  comparator: 'label',

//  docType: Movie.prototype.docType.toLowerCase(),

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

      return movie.save(); // TODO : doesn't return a promise !
    }).catch((err) => {
      // Fail silenlty.
      console.error(err);
      return Promise.resolve();
    });
  },


  addFromVideoStreams: function () {
    const since = app.properties.get('lastVideoStream') || '';
    let last = since;

    return AsyncPromise.queryPaginated(skip => this.getIndexVideoStreamByDate()
      .then(index => cozy.client.data.query(index,
        { selector: { timestamp: { $gt: since } }, skip, wholeResponse: true }))
    )
    .then((results) => {
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult.timestamp > since) {
        last = lastResult.timestamp;
      }

      const videoStreams = results.filter(vs => (vs.action === 'Visualisation'
        && vs.details && vs.details.offerName !== 'AVSP TV LIVE' && vs.details.offerName !== 'OTV'
        && vs.content && !vs.content.subTitle));
      return AsyncPromise.series(videoStreams, this.addVideoStreamToLibrary, this);
    })
    .then(() => {
      app.properties.set('lastVideoStream', last);
      return app.properties.save();
    });
  },


  getIndexVideoStreamByDate: function () {
    this.indexVideoStreamByDate = this.indexVideoStreamByDate || cozy.client.data.defineIndex(
      'org.fing.mesinfos.videostream',
      // ['timestamp', 'action', 'details', 'content']
      ['timestamp']
      );

    return this.indexVideoStreamByDate;
  },

  //TODO
  // defineVideoStreamMoviesByDateView: function () {
  //   const mapFun = function (doc) {
  //     if (doc.action === 'Visualisation'
  //       && doc.details.offerName !== 'AVSP TV LIVE' && doc.details.offerName !== 'OTV'
  //       && !(doc.content.subTitle && doc.content.subTitle !== '')) {
  //       emit(doc.timestamp);
  //     }
  //   };
  //   return cozysdk.defineView('videostream', 'moviesByDate', mapFun.toString());
  // },
});
