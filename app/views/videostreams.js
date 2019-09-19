/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


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

  initialize: function () {
    this.model = new Backbone.Model({ title: 'Mes programmes visionnés via ma Livebox Orange' });
  },

  onRender: function () {
    app.trigger('mainTitle:set', this.model.get('title'));
    this.showChildView('collection', new CollectionView({ collection: this.collection }));
  },
});
