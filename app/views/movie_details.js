var app = undefined;


module.exports = Mn.View.extend({
  template: require('./templates/movie_details'),

  events: {
    'click #save': 'saveMovie',
    'click .play': 'playSoundtrack',
  },

  initialize: function() {
    app = require('../application');
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

  playSoundtrack: function() {
    let soundtracks = this.model.get('soundtracks');
    if (!soundtracks || soundtracks.length === 0) {
      return app.trigger('error', 'Pas de bande originale');
    }

    app.trigger('play:album', soundtracks[soundtracks.length - 1]);
  },
});

