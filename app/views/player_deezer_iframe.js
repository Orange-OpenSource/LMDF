'use-strict';

const template = require('views/templates/player');

module.exports = Mn.View.extend({
  tagName: 'div',
  className: 'player',
  template: template,

  initialize: function () {
    this.listenTo(app, 'play:album', this.playAlbum);
    this.listenTo(app, 'play:tracks', this.playTracks);
  },

  playAlbum: function (album) {
    if (album.deezerAlbumId) {
      this.setDeezerPlay(album.deezerAlbumId, 'album');
    } else {
      return app.trigger('error', "Pas d'ID deezer");
    }
  },

  onAttach: function () {
    this.setDeezerPlay('', 'tracks');
  },

  playTracks: function (tracksId) {
    this.setDeezerPlay(tracksId.join(','), 'tracks');
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'true',
      playlist: false,
      width: 600,
      height: 60,
      color: '007FEB',
      layout: 'dark',
      size: 'medium',
      app_id: 1,
      type: type,
      id: id,
    };

    $('#deezerFrame').attr('src', `//www.deezer.com/plugins/player?${$.param(params)}`);
  },
});
