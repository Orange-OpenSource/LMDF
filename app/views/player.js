'use-strict';

const template = require('views/templates/player');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  initialize: function () {
    this.listenTo(app, 'play:album', this.playAlbum);
    this.listenTo(app, 'play:tracks', this.playTracks);
  },

  playAlbum: function (album) {
    console.log('truc');
    console.log(album);
    if (album.deezerAlbumId) {
      this.setDeezerPlay(album.deezerAlbumId, 'album');
    } else {
      return app.trigger('error', "Pas d'ID deezer");
    }
  },

  playTracks: function(tracksId) {
    this.setDeezerPlay(tracksId.join(','), 'tracks');
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'false',
      playlist: true,
      width: 600,
      height: 350,
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
