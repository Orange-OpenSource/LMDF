'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');
const Model = require('../models/videostream');

module.exports = CozyCollection.extend({
  model: Model,
  comparator: (a, b) => {
    return (a.get('timestamp') > b.get('timestamp')) ? -1 : 1;
  },

  findAudioVisualWork: function (videoStream) {
    return videoStream.findAudioVisualWork()
    .then((avw) => {
      avw.setViewed(videoStream);
      return avw.save();
    })
    .then(() => videoStream.trigger('change'))
    .catch((err) => {
      // Fail silenlty.
      console.error(err);
      return Promise.resolve();
    });
  },

  findAudioVisualWorks: function () {
    // const since = '';
    const since = app.properties.get('lastVideoStream') || '';
    const videoStreams = this.filter(vs => vs.get('timestamp') > since);
    return funpromise.series(videoStreams, this.findAudioVisualWork.bind(this))
    .then(() => {
      app.properties.set('lastVideoStream', this.size() > 0 ? this.first().get('timestamp') : '');
      return app.properties.save();
    });
  },
});
