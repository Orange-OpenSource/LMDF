var app = null;

module.exports = Mn.View.extend({
  tagName: 'div',
  template: require('views/templates/player'),

  initialize: function() {
    app = require('../application');
    this.listenTo(app, 'play:album', this.playAlbum);
  },

  playAlbum: function(album) {
    if (album.deezerAlbumId) {
      this.setDeezerPlay(album.deezerAlbumId, 'album');
    } else {
      return app.trigger('error', "Pas d'ID deezer");
    }
  },

  setDeezerPlay: function(id, type) {
    $('#deezerFrame').attr('src', `http://www.deezer.com/plugins/player?format=classic&autoplay=false&playlist=true&width=700&height=350&color=007FEB&layout=dark&size=medium&app_id=1&type=${type}&id=${id}`);
  },
});
