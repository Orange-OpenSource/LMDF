var MessageView = require('views/message');
var SearchView = require('views/search');
var DetailsView = require('views/movie_details');
var LibraryView = require('views/movie_library');
var PlayerView = require('views/player');

var Movie = require('models/movie');

var app = undefined;

module.exports = Mn.View.extend({

  template: require('views/templates/app_layout'),
  el: '[role="application"]',

  behaviors: {},

  regions: {
    library: '.library',
    search: '.search',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function() {
    app = require('application');

    var self = this;
    this.listenTo(app, 'search:foundWDSuggestionsMovie', wdSuggestionMovie => {
      console.log('toto2');
      Movie.fromWDSuggestionMovie(wdSuggestionMovie).then(movie => {
        console.log('toto3');
        this.showMovieDetails(movie);
      }, console.log.bind(console));
    });

    this.listenTo(app, 'details:show', this.showMovieDetails);
  },

  onRender: function() {
    this.showChildView('message', new MessageView());
    this.showChildView('search', new SearchView());
    this.showChildView('library', new LibraryView({ collection: app.movies }));
    this.showChildView('player', new PlayerView());

  },

  showMovieDetails: function(movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },
});
