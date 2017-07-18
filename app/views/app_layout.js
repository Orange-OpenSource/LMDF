'use-strict';

const MessageView = require('views/message');
const DetailsView = require('views/movie_details');
const MovieLibraryView = require('views/movie_library');
const VideoStreamsView = require('views/videostreams');
const SearchResultsView = require('views/movie_searchresults');
const LeftPanelView = require('views/left_panel');
const template = require('views/templates/app_layout');

module.exports = Mn.View.extend({
  template: template,
  el: '[role="application"]',

  behaviors: {},

  regions: {
    leftpanel: {
      el: 'aside.drawer',
      replaceElement: true,
    },
    searchresults: {
      el: '.searchresults',
      replaceElement: true,
    },
    library: '.library',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function () {
    this.listenTo(app, 'search', this.showSearchResults);
    this.listenTo(app, 'search:close', this.closeSearchResults);
    this.listenTo(app, 'details:show', this.showMovieDetails);
    this.listenTo(app, 'library:show', this.showLibrary);
  },

  onRender: function () {
    this.showChildView('message', new MessageView());
    this.showLibrary('videostreams'); // default view is videostream.
    this.showChildView('leftpanel', new LeftPanelView());
  },

  showMovieDetails: function (movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },

  onChildviewDetailsClose: function () {
    this.getRegion('details').empty();
  },


  showSearchResults: function (query) {
    if (!this.getRegion('searchresults').hasView()) {
      this.getRegion('library').$el.hide();
      this.showChildView('searchresults', new SearchResultsView({
        model: new Backbone.Model(query)
      }));
    }
  },

  showLibrary: function (slug) {
    let view = null;

    switch (slug) {
      case 'videostreams': view = new VideoStreamsView({ collection: app.videoStreams }); break;
      case 'movies': view = new MovieLibraryView({ collection: app.movies }); break;
      default: view = null;
    }
    console.log(view);
    this.getRegion('library').empty();
    this.showChildView('library', view);

    this.closeSearchResults();
  },

  closeSearchResults: function () {
    this.getRegion('searchresults').empty();
    this.getRegion('library').$el.show();
  },
});
