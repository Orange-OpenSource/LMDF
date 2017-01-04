'use-strict';

const MovieItemView = require('./movie_item');
const SearchResultsCollection = require('../collections/search_results');
const template = require('./templates/movie_searchresults');
const emptyViewTemplate = require('./templates/movie_searchresults_empty');

const SearchResultsView = Mn.CollectionView.extend({
  tagName: 'ul',

  className: 'movielibrary',
  childView: MovieItemView,

  initialize: function () {
    this.collection = new SearchResultsCollection();
    this.listenTo(app, 'search', this.onQueryMovie);
  },

  onQueryMovie: function (query) {
    this.collection.reset();
    if (query.selected) {
      this.collection.fromWDSuggestionMovie(query.selected)
      .then((movie) => {
        if (!movie) { return console.log('no film for this suggestion !'); }
        app.trigger('details:show', movie);
      }).then(() => this.collection.fromKeyword(query.q));
    } else {
      this.collection.fromKeyword(query.q);
    }
  },

  emptyView: Mn.View.extend({ template: emptyViewTemplate, }),
});


module.exports = Mn.View.extend({
  className: 'searchresults',
  template: template,

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

  initialize: function () {
    this.listenTo(app, 'search', query => this.ui.query.html(query.q));
  },

  onRender: function () {
    const searchResultsView = new SearchResultsView();
    searchResultsView.onQueryMovie(this.model.attributes);
    this.showChildView('collection', searchResultsView);
  },

  onClose: function () {
    app.trigger('search:close');
  },
});
