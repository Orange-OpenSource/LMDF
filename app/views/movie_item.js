'use-strict';

const template = require('./templates/movie_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  events: {
    //eslint-disable-next-line
    'click': 'showDetails',
  },

  serializeData: function () {
    const json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },

  showDetails: function () {
    app.trigger('details:show', this.model);
  },
});
