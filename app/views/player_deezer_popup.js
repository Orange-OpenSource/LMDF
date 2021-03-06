/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


'use-strict';

module.exports = Mn.View.extend({
  tagName: 'div',
  className: 'player',
  template: () => '',

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

  playTracks: function (tracksId) {
    const idList = tracksId.filter(id => Boolean(id)).join(',');
    this.setDeezerPlay(idList, 'tracks');
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'true',
      playlist: true,
      width: 700,
      height: 350,
      color: '007FEB',
      layout: 'dark',
      size: 'medium',
      app_id: 1,
      type: type,
      id: id,
    };
    open(`//www.deezer.com/plugins/player?${$.param(params)}`, 'Deezer Player', 'width=700,height=350');
  },
});
