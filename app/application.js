'use-strict';

// Main application that create a Mn.Application singleton and
// exposes it.
const AsyncPromise = require('./lib/async_promise');
const MoviesCollection = require('./collections/movies');
const Router = require('router');
const AppLayout = require('views/app_layout');
const Properties = require('models/properties');

const bPromise = AsyncPromise.backbone2Promise;


require('views/behaviors');

const Application = Mn.Application.extend({

  prepare: function () {
    this._splashMessages();
    this.movies = new MoviesCollection();
    this.properties = Properties;

    return this.properties.fetch()
    .then(() => this._defineViews())
    .then(() => bPromise(this.movies, this.movies.fetch));
  },

  prepareInBackground: function () {
    return this.movies.addFromVideoStreams()
    .catch(err => this.trigger('message:error', err));
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
  },

  _defineViews: function () {
    this.trigger('message:display', 'Préparation de la liste de film', 'defineviews');
    return Promise.all([
      this.movies.defineMovieAllView(),
      this.movies.defineVideoStreamMoviesByDateView()])
    .then(() => this.trigger('message:hide', 'defineviews'))
    .catch((err) => {
      console.err(err);
      this.trigger('message:error', 'Erreur à la définition des vues.');
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
  .then(() => application.prepareInBackground())
  .then(() => application.start());
});

