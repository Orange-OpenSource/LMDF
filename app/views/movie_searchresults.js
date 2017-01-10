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
    this.$el.toggleClass('loading', true);
    Promise.resolve().then(() => {
      if (query.selected) {
        return this.collection.fromWDSuggestionMovie(query.selected)
        .then((movie) => {
          if (!movie) { return console.log('no film for this suggestion !'); }
          app.trigger('details:show', movie);
        });
      }
    }).then(() => {
      return this.collection.fromKeyword(query.q);
    }).then(() => {
      this.$el.toggleClass('loading', false);
    });
  },

  emptyView: Mn.View.extend({
    className: 'empty',
    template: emptyViewTemplate,
  }),
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
    this.listenTo(app, 'search', this.onSearch);
  },

  onSearch: function (query) {
    this.ui.query.html(query.q);
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
