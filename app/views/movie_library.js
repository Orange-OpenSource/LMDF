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
