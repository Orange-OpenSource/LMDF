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
  },

  triggers: {
    //eslint-disable-next-line
    'click': 'expand',
  },

  events: {
    'click @ui.libraryOptions': 'onLibraryChanged',
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
    const elem = ev.currentTarget;
    this.ui.libraryOptions.toggleClass('selected', false);

    elem.classList.add('selected');
    app.trigger('library:show', elem.dataset.value);
  },
});
