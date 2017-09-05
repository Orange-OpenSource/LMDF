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
  tagName: 'section',
  template: template,

  ui: {
    title: 'h2',
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

  onLoading: function () {
    this.$el.toggleClass('loading', true);
    this.ui.title.text(
      `Recherche des films et séries dont le titre contient « ${this.model.get('q')} » sur Wikidata, en cours :`);
    app.trigger('mainTitle:set', `Recherche : « ${this.model.get('q')} »`);
  },

  onLoaded: function () {
    this.$el.toggleClass('loading', false);
    this.ui.title.text(`Films et séries dont le titre contient « ${this.model.get('q')} », trouvés sur Wikidata :`);
    app.trigger('mainTitle:set', `Films et séries pour : « ${this.model.get('q')} »`);
  },


  onRender: function () {
    const searchResultsView = new SearchResultsView({ collection: this.collection });
    this.showChildView('collection', searchResultsView);
    this.onSearch(this.model.attributes);
  },
});
