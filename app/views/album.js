'use-strict';

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  className: 'album',

  events: {
    "click .track button.play": 'onPlayTrack',
    "click .albuminfo button.play": 'onPlayAlbum',
  },

  onPlayAlbum: function(ev) {
    if (this.model.has('tracks')) {
      app.trigger('play:tracks', this.model.get('tracks').map(track => track.deezerId));
    }
  },

  onPlayTrack: function(ev) {
    app.trigger('play:tracks', [ev.target.dataset['deezerid']]);
  },
});
