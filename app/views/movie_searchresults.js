'use-strict'
const MovieItemView = require('./movie_item');
const SearchResultsCollection = require('../collections/search_results');

let app = null;

const SearchResultsView = Mn.CollectionView.extend({
  tagName: 'ul',

  className: 'movielibrary',
  childView: MovieItemView,

  initialize: function() {
    this.collection = new SearchResultsCollection();
    this.listenTo(app, 'search', this.onQueryMovie);
  },

  onQueryMovie: function(query) {
    if (query.selected) {
      this.collection.fromWDSuggestionMovie(query.selected)
      .then(movie => {
        if (!movie) { console.log('no film for this suggestion !'); }
        app.trigger('details:show', movie);
        return;
      }).then(() => {
        return this.collection.fromKeyword(query.q);
      });
    } else {
      this.collection.fromKeyword(query.q);
    }
  },
});

module.exports = Mn.View.extend({
  className: 'searchresults',
  template: require('./templates/movie_searchresults'),

  ui: {
    query: '.query'
  },

  events: {
    'click .close': 'onClose',
  },

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  initialize: function() {
    app = require('application');
    this.listenTo(app, 'search', (query) => { this.ui.query.html(query.q); });
  },

  onRender: function() {
    let searchResultsView = new SearchResultsView();
    searchResultsView.onQueryMovie(this.model.attributes);
    this.showChildView('collection', searchResultsView);
  },

  onClose: function() {
    app.trigger('search:close');
  },
});
