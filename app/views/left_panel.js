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


'use-strict';

const appName = require('../lib/appname_version');

const SearchView = require('views/search');
const template = require('./templates/left_panel');


module.exports = Mn.View.extend({
  tagName: 'aside',
  className: 'drawer',
  template: template,

  behaviors: {
    Toggle: {},
  },

  ui: {
    libraryOptions: '.selectlibrary li',
    search: '.search',
    howitworks: '.howitworks',
  },

  triggers: {
    //eslint-disable-next-line
    'click': 'expand',
  },

  events: {
    'click @ui.libraryOptions': 'onLibraryChanged',
    'click @ui.howitworks': 'selectCodesign'
  },

  regions: {
    search: '@ui.search',
  },

  serializeData: function () {
    return { appName: appName };
  },
  onRender: function () {
    this.showChildView('search', new SearchView());
    // Listen to toggle from responsive topbar button toggle-drawer.
    $('.toggle-drawer').click(() => this.triggerMethod('toggle'));
  },

  onLibraryChanged: function (ev) {
    this._setSelected(ev);
    const elem = ev.currentTarget;
    app.trigger('library:show', elem.dataset.value);
  },

  selectCodesign: function (ev) {
    this._setSelected(ev);
    app.trigger('mainview:set', 'howitworks');
  },

  _setSelected: function (ev) {
    const elem = ev.currentTarget;
    this.ui.libraryOptions.toggleClass('selected', false);
    this.ui.howitworks.toggleClass('selected', false);

    elem.classList.add('selected');
  },
});
