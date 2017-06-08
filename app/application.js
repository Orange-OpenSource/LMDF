'use-strict';

// Main application that create a Mn.Application singleton and
// exposes it.
const AsyncPromise = require('./lib/async_promise');
const Router = require('router');
const AppLayout = require('views/app_layout');

const Properties = require('models/properties');
const MoviesCollection = require('./collections/movies');

const bPromise = AsyncPromise.backbone2Promise;

require('views/behaviors');

const Application = Mn.Application.extend({

  prepare: function () {
    this._splashMessages();

    const appElem = $('[role=application]')[0];

    this.cozyDomain = appElem.dataset.cozyDomain;
    cozy.client.init({
      cozyURL: `//${this.cozyDomain}`,
      token: appElem.dataset.cozyToken,
    });
    cozy.bar.init({ appName: 'La musique de mes films' });

    this.movies = new MoviesCollection();
    this.properties = Properties;
    return this.properties.fetch()
    .then(() => bPromise(this.movies, this.movies.fetch));
  },

  prepareInBackground: function () {
    this.trigger('message:display',
      'Ajout des films visionnés via VoD et Replay sur Livebox ...', 'addFromVideoStreams');
    this.movies.addFromVideoStreams()
    .catch(err => this.trigger('message:error', err))
    .then(() => this.trigger('message:hide', 'addFromVideoStreams'));

    return Promise.resolve();
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
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
  .then(() => application.start())
  .then(() => application.prepareInBackground())
  .catch((err) => {
    const msg = "Erreur au lancement de l'application";
    console.error(msg);
    console.error(err);
    application.trigger('message:error', msg);
  });
});

