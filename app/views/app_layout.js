'use-strict';

const MessageView = require('views/message');
const DetailsView = require('views/movie_details');
const MovieLibraryView = require('views/movie_library');
const VideoStreamsView = require('views/videostreams');
const SearchResultsView = require('views/movie_searchresults');
const HowItWorksView = require('views/how_it_works');
const LeftPanelView = require('views/left_panel');
const template = require('views/templates/app_layout');

module.exports = Mn.View.extend({
  template: template,
  el: '[role="application"]',

  behaviors: {},

  ui: {
    mainTitle: 'h1',
  },

  regions: {
    leftpanel: {
      el: 'aside.drawer',
      replaceElement: true,
    },
    main: 'main',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function () {
    this.listenTo(app, 'search', query => this.setMainView('search', query));
    this.listenTo(app, 'library:show', this.setMainView);
    this.listenTo(app, 'mainview:set', this.setMainView);

    this.listenTo(app, 'details:show', this.showMovieDetails);
    this.listenTo(app, 'mainTitle:set', title => this.ui.mainTitle.text(title));
  },

  onRender: function () {
    this.showChildView('message', new MessageView());
    this.setMainView('videostreams'); // default view is videostream.
    this.showChildView('leftpanel', new LeftPanelView());
  },

  showMovieDetails: function (movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },

  onChildviewDetailsClose: function () {
    this.getRegion('details').empty();
  },

  setMainView: function (slug, options) {
    if (slug === this.currentMain) return;
    let view = null;
    switch (slug) {
      case 'search':
        view = new SearchResultsView({ model: new Backbone.Model(options.query) });
        break;
      case 'videostreams': view = new VideoStreamsView({ collection: app.videoStreams }); break;
      case 'movies':
        view = new MovieLibraryView({ collection: app.movies, model: new Backbone.Model({ title: 'Mes Fims' }) });
        break;
      case 'tvseries':
        view = new MovieLibraryView({ collection: app.tvseries, model: new Backbone.Model({ title: 'Mes Séries' }) });
        break;
      case 'howitworks':
        view = new HowItWorksView();
        break;

      default: view = null;
    }

    this.getRegion('main').empty();
    this.showChildView('main', view);
    this.currentMain = slug;
  },

});
