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

// Main application that create a Mn.Application singleton and
// exposes it.
const Router = require('router');
const AppLayout = require('views/app_layout');

const AppNameVersion = require('lib/appname_version');
const VersionsMigrations = require('versionsmigrations');
const Properties = require('models/properties');
const MoviesCollection = require('./collections/movies');
const TVSeriesCollection = require('./collections/tvseries');
const VideoStreamsCollection = require('./collections/videostreams');

require('views/behaviors');

const Application = Mn.Application.extend({

  prepare: function () {
    this._splashMessages();
    moment.locale('fr');
    const appElem = $('[role=application]')[0];

    this.cozyDomain = appElem.dataset.cozyDomain;
    cozy.client.init({
      cozyURL: `//${this.cozyDomain}`,
      token: appElem.dataset.cozyToken,
    });

    this.movies = new MoviesCollection();
    this.tvseries = new TVSeriesCollection();
    this.videoStreams = new VideoStreamsCollection();
    this.properties = Properties;
    this._initBloodhound();
    return this.properties.fetch()
    .then(() => Promise.all([
      this.videoStreams.fetch(),
      this.movies.fetch(),
      this.tvseries.fetch(),
      $.getJSON('data/how_it_works.json').then((data) => { PLD.allItems = data; }),
    ]));
  },

  upgrade: function () {
    const lastRunVersion = this.properties.get('appVersion') || '';
    const curVersion = AppNameVersion.split('-', 2)[1];

    if (lastRunVersion !== curVersion) {
      // Is newer version !! Do something !!
      this.trigger('message:display', "Mise à jour vers la nouvelle version de l'application", 'appversionmigration');
      return VersionsMigrations.runMigration(lastRunVersion, curVersion)
      .then(() => {
        this.properties.set('appVersion', curVersion);
        this.trigger('message:hide', 'appversionmigration');
        return this.properties.save();
      });
    }

    return Promise.resolve();
  },

  prepareInBackground: function () {
    cozyUsetracker()
    .catch(err => console.warn('Error while initializing tracking.', err))
    .then(() => cozy.bar.init({ appName: 'La musique de mes films' }));

    this.trigger('message:display',
      'Ajout des films et séries visionnés via VoD et Replay sur Livebox ...', 'findAudioVisualWorks');
    this.videoStreams.findAudioVisualWorks()
    .catch((err) => {
      console.error('Error in prepare in background', err);
      this.trigger('message:error', err);
    })
    .then(() => this.trigger('message:hide', 'findAudioVisualWorks'));

    return Promise.resolve();
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
  },

  _initBloodhound: function () {
    this.bloodhound = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('label'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      identify: item => item.id,
      prefetch: {
        url: 'data/wikidata_movie_tvserie_labels.json',
        cache: false,
        //cacheKey: 'M',
      },
    });
  },

  onBeforeStart: function () {
    this.layout = new AppLayout();
    this.router = new Router();

    if (typeof Object.freeze === 'function') {
      Object.freeze(this);
    }
  },

  onStart: function () {
    this.layout.render();
    // prohibit pushState because URIs mapped from cozy-home rely on fragment
    if (Backbone.history) {
      Backbone.history.start({ pushState: false });
    }
    // TODO : keep this, display always a random details.
    // let randomIndex = Math.floor(Math.random() * this.movies.size());
    // this.layout.showMovieDetails(this.movies.at(randomIndex));
  },
});

const application = new Application();

module.exports = application;
window.app = application;

document.addEventListener('DOMContentLoaded', () => {
  application.prepare()
  .catch((err) => {
    const msg = "Erreur pendant la préparation de l'application";
    console.error(msg);
    console.error(err);
    application.trigger('message:error', msg);
  })
  .then(() => application.upgrade())
  .then(() => application.start())
  .then(() => application.prepareInBackground())
  .catch((err) => {
    const msg = "Erreur au lancement de l'application";
    console.error(msg);
    console.error(err);
    application.trigger('message:error', msg);
  });
});
