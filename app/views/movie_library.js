'use strict';

const MovieItemView = require('./movie_item');
const emptyViewTemplate = require('./templates/movie_library_empty');


module.exports = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: MovieItemView,
  emptyView: Mn.View.extend({ template: emptyViewTemplate, }),
});
