'use-strict';

const PlayerView = require('./player');
const SoundTracksView = require('./soundtracks');
const template = require('./templates/movie_details');

const Deezer = require('../lib/deezer');

module.exports = Mn.View.extend({
  template: template,

  regions: {
    //player: '.player',
    soundtracks: {
      el: '.soundtracks > ul',
      replaceElement: true,
    },
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
    console.log(this.model.attributes);
    // this.showChildView('player', new PlayerView());
    this.model.getSoundtracks()
    .then((soundtracks) => {
      this.showChildView('soundtracks', new SoundTracksView({
      collection: new Backbone.Collection(soundtracks) }));
    });


    // Deezer.getSoundtracks(this.model.attributes).then(
    //   () => {
    // this.showChildView('soundtracks', new SoundTracksView({
    //   collection: new Backbone.Collection(this.model.get('soundtracks')),
    // }));
  },

  onDomRefresh: function () {
    this.playSoundtrack();
  },

  saveMovie: function () {
    app.movies.add(this.model);
    this.model.save();
  },

  playSoundtrack: function () {
    const soundtracks = this.model.get('soundtracks');
    if (!soundtracks || soundtracks.length === 0) {
      return app.trigger('error', 'Pas de bande originale');
    }

    app.trigger('play:album', soundtracks[soundtracks.length - 1]);
  },
});
