'use strict';

const AudioVisualWork = require('./audiovisualwork');

module.exports = AudioVisualWork.extend({
  docType: 'fr.orange.movie',
  save: function () {
    if (this.isNew()) {
      app.movies.add(this);
    }
    //eslint-disable-next-line
    return AudioVisualWork.prototype.save.call(this, arguments);
  },
});
