'use-strict';

const template = require('./templates/movie_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  events: {
    //eslint-disable-next-line
    'click': 'showDetails',
  },

  modelEvents: {
    change: 'render',
  },

  initialize: function () {
    this.model.fetchPosterUri();
  },

  showDetails: function () {
    app.trigger('details:show', this.model);
  },
});
