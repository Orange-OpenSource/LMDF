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

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  className: 'album',

  events: {
    'click .track button.play': 'onPlayTrack',
    'click .albuminfo button.play': 'onPlayAlbum',
  },

  onPlayAlbum: function () {
    if (this.model.has('tracks')) {
      app.trigger('play:tracks', this.model.get('tracks').map(track => track.deezerId));
    }
  },

  onPlayTrack: function (ev) {
    app.trigger('play:tracks', [ev.currentTarget.dataset.deezerid]);
  },
});
