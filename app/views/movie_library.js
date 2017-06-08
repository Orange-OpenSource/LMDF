'use strict';

const MovieItemView = require('./movie_item');
const EmptyView = require('./movie_library_empty');
const template = require('./templates/my_movies');

const MovieLibraryView = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: MovieItemView,
  emptyView: EmptyView,
});

module.exports = Mn.View.extend({
  className: 'mymovies',
  template: template,

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  onRender: function () {
    this.showChildView('collection', new MovieLibraryView({ collection: this.collection }));
  },
});
