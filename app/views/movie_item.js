
module.exports = Mn.View.extend({
  template: require('./templates/movie_item'),
  tagName: 'li',

  events: {
    'click': 'showDetails',
  },

  initialize: function() {
    app = require('application');
  },

  serializeData: function() {
    var json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },

  showDetails: function() {
    app.trigger('details:show', this.model);
  },
});