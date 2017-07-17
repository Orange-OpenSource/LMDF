'use strict';

const ItemView = require('./videostream_item');
const EmptyView = require('./movie_library_empty');
const template = require('./templates/videostreams');

const CollectionView = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: ItemView,
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
    this.showChildView('collection', new CollectionView({ collection: this.collection }));
  },
});
