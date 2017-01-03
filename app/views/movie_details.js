'use-strict';

const PlayerView = require('views/player');
const template = require('./templates/movie_details');

module.exports = Mn.View.extend({
  template: template,

  regions: {
    player: '.player',
  },

  events: {
    'click #save': 'saveMovie',
  },

  triggers: {
    'click .close': 'details:close',
  },

  serializeData: function () {
    const json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },

  onRender: function () {
    this.showChildView('player', new PlayerView());
    // TODO: could we avoid this with dom:refresh view event ?
    setTimeout(this.playSoundtrack.bind(this), 100);
  },

  saveMovie: function () {
    this.model.save();
    // TODO : add to collection and update !
  },

  playSoundtrack: function () {
    const soundtracks = this.model.get('soundtracks');
    if (!soundtracks || soundtracks.length === 0) {
      return app.trigger('error', 'Pas de bande originale');
    }

    app.trigger('play:album', soundtracks[soundtracks.length - 1]);
  },
});
