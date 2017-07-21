'use strict';

const AudioVisualWork = require('./audiovisualwork');

module.exports = AudioVisualWork.extend({
  docType: 'fr.orange.tvserie',
  save: function () {
    if (this.isNew()) {
      app.tvseries.add(this);
    }
    //eslint-disable-next-line
    return AudioVisualWork.prototype.save.call(this, arguments);
  },
});
