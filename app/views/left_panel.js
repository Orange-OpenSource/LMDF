var SearchView = require('views/search');

var app = null;

module.exports = Mn.View.extend({
  tagName: 'aside',
  className: 'drawer',
  template: require('./templates/left_panel'),

  behaviors: {
    Toggle: {},
  },

  ui: {},

  triggers: {
    'click': 'expand',
  },
  regions: {
    search: '.search',
  },

  initialize: function() {
    app = require('application');
  },

  onRender: function() {
    this.showChildView('search', new SearchView());
    $('.toggle-drawer').click(() => this.triggerMethod('toggle'))
  },

});