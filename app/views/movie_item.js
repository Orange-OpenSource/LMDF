
module.exports = Mn.View.extend({
  template: require('./templates/movie_item'),
  tagName: 'li',

  serializeData: function() {
    var json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },
});