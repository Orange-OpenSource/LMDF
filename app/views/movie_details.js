var app = undefined;


module.exports = Mn.View.extend({
  template: require('./templates/movie_details'),

  events: {
    'click #save': 'saveMovie',
  },

  serializeData: function() {
    var json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },

  saveMovie: function() {
    this.model.save();
    // TODO : add to collection !
  },
});

