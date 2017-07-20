'use-strict';

// Main application that create a Mn.Application singleton and
// exposes it.
const AsyncPromise = require('./lib/async_promise');
const Router = require('router');
const AppLayout = require('views/app_layout');

const Properties = require('models/properties');
const MoviesCollection = require('./collections/movies');
const TVSeriesCollection = require('./collections/tvseries');
const VideoStreamsCollection = require('./collections/videostreams');

const bPromise = AsyncPromise.backbone2Promise;

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
    cozy.bar.init({ appName: 'La musique de mes films' });

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
    ]));
  },

  prepareInBackground: function () {
    // this.trigger('message:display',
    //   'Ajout des films visionnés via VoD et Replay sur Livebox ...', 'addFromVideoStreams');
    // this.movies.addFromVideoStreams()
    // .catch(err => this.trigger('message:error', err))
    // .then(() => this.trigger('message:hide', 'addFromVideoStreams'));

    return Promise.resolve();
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
  },

  _initBloodhound: function () {
    this.bloodhound = new Bloodhound({
      //datumTokenizer: item => Bloodhound.tokenizers.whitespace(item.label),
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('label'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      identify: item => item.id,
      // sorter: (a, b) => { return (a.label < b.label) ? -1 : 1; },
      prefetch: {
        url: 'data/wikidata_movie_tvserie_labels.json',
        cache: false,
        //cacheKey: 'M',
      },
      // remote: {
      //
      //   prepare: (query, settings) => {
      //     console.log(query);
      //     const prefix = encodeURIComponent(query.slice(0, 2).toLowerCase());
      //     settings.url = settings.url.replace('%FIRST', prefix[0]).replace('%PREFIX', prefix);
      //     return settings;
      //   },
      // },
    });
    // this.bloodhound.remote.transform = (response) => {
    //   console.log(response);
    //   this.bloodhound.add(response);
    //   return [];
    // }
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
