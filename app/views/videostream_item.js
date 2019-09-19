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

const MovieItem = require('./movie_item');
const template = require('./templates/videostream_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  ui: {
    poster: '.poster',
    img: '.poster img',
  },

  regions: {
    audiovisualwork: '.audiovisualwork',
  },

  events: {
    //eslint-disable-next-line
    // 'click': 'showDetails',
  },

  modelEvents: {
    change: 'render',
  },

  onRender: function () {
    const audiovisualWork = this.model.getAudioVisualWork();
    if (audiovisualWork) {
      this.showChildView('audiovisualwork', new MovieItem({ model: audiovisualWork }));
    }
  },

  // showDetails: function () {
  //   app.trigger('details:show', this.model);
  // },
});
