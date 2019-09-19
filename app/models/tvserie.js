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


'use strict';

const AudioVisualWork = require('./audiovisualwork');

module.exports = AudioVisualWork.extend({
  docType: 'fr.orange.tvserie',

  defaults: _.extend({ type: 'tvserie' }, AudioVisualWork.defaults),

  save: function () {
    if (this.isNew()) {
      app.tvseries.add(this);
    }
    //eslint-disable-next-line
    return AudioVisualWork.prototype.save.call(this, arguments);
  },
});
