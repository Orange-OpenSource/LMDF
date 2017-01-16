'use strict';

const AlbumView = require('./album');

module.exports = Mn.CollectionView.extend({
  tagName: 'ul',
  // className: 'movielibrary',
  childView: AlbumView,
});
