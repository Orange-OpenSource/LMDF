'use strict'

const MovieItemView = require('./movie_item');

module.exports = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: MovieItemView,
});