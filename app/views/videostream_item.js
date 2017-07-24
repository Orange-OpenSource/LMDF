'use-strict';

const MovieItem = require('./movie_item');
const template = require('./templates/videostream_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  ui: {
    poster: '.poster',
    img: '.poster img',
  },

  regions: {
    audiovisualwork: '.audiovisualwork',
  },

  events: {
    //eslint-disable-next-line
    // 'click': 'showDetails',
  },

  modelEvents: {
    change: 'render',
  },

  onRender: function () {
    const audiovisualWork = this.model.getAudioVisualWork();
    if (audiovisualWork) {
      this.showChildView('audiovisualwork', new MovieItem({ model: audiovisualWork }));
    }
  },

  // showDetails: function () {
  //   app.trigger('details:show', this.model);
  // },
});
