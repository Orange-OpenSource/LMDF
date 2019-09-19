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

const template = require('./templates/movie_library_empty');


module.exports = Mn.View.extend({
  template: template,

  events: {
    'click button.konnector': 'fireIntent',
  },

  fireIntent: function () {
    cozy.client.intents.create('CREATE', 'io.cozy.accounts', { slug: 'orangevideos' })
    .start(document.getElementById('popin'))
    .catch((err) => {
      const msg = "Erreur lors de l'activation du connecteur Orange Videos";
      console.error(msg);
      console.error(err);
      app.trigger('message:error', msg);
    });
  },
});
