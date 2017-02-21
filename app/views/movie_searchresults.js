'use-strict';

const MovieItemView = require('./movie_item');
const SearchResultsCollection = require('../collections/search_results');
const template = require('./templates/movie_searchresults');
const emptyViewTemplate = require('./templates/movie_searchresults_empty');

const SearchResultsView = Mn.CollectionView.extend({
  tagName: 'ul',

  className: 'movielibrary',
  childView: MovieItemView,

  emptyView: Mn.View.extend({
    className: 'empty',
    template: emptyViewTemplate,
  }),
});


module.exports = Mn.View.extend({
  className: 'searchresults',
  template: template,

  ui: {
    title: 'h2',
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
    this.collection = new SearchResultsCollection();
    this.listenTo(this.collection, 'done', this.onLoaded);
  },

  onSearch: function (query) {
    this.model.attributes = query;
    this.collection.reset();
    this.collection.fromKeyword(query.q); // async
    this.onLoading();
  },

  onLoading: function() {
    this.$el.toggleClass('loading', true);
    this.ui.title.text(`Recherche des films dont le titre contient « ${this.model.get('q')} » sur Wikidata, en cours :`);
  },

  onLoaded: function () {
    this.$el.toggleClass('loading', false);
    this.ui.title.text(`Films dont le titre contient « ${this.model.get('q')} », trouvés sur Wikidata :`);
  },


  onRender: function () {
    const searchResultsView = new SearchResultsView({ collection: this.collection});
    this.showChildView('collection', searchResultsView);
    this.onSearch(this.model.attributes);
  },

  onClose: function () {
    app.trigger('search:close');
  },
});
