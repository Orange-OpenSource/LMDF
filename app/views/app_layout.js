var MessageView = require('views/message');
var DetailsView = require('views/movie_details');
var LibraryView = require('views/movie_library');
var SearchResultsView = require('views/movie_searchresults');
var LeftPanelView = require('views/left_panel');

var Movie = require('models/movie');

var app = undefined;

module.exports = Mn.View.extend({

  template: require('views/templates/app_layout'),
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

  initialize: function() {
    app = require('application');

    this.listenTo(app, 'search', this.showSearchResults);
    this.listenTo(app, 'search:close', this.closeSearchResults);
    this.listenTo(app, 'details:show', this.showMovieDetails);
  },

  onRender: function() {
    this.showChildView('message', new MessageView());
    this.showChildView('library', new LibraryView({ collection: app.movies }));
    this.showChildView('leftpanel', new LeftPanelView());
  },

  showMovieDetails: function(movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },

  showSearchResults: function(query) {
    if (!this.getRegion('searchresults').hasView()) {
      this.getRegion('library').$el.hide();
      this.showChildView('searchresults', new SearchResultsView({
        model: new Backbone.Model(query)
      }));
    }
  },

  closeSearchResults: function() {
    this.getRegion('searchresults').empty();
    this.getRegion('library').$el.show();
  },

  onChildviewDetailsClose: function() {
    this.getRegion('details').empty();
  },
});
