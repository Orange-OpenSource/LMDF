var MessageView = require('views/message');
var SearchView = require('views/search');

var app = undefined;

module.exports = Mn.View.extend({

  template: require('views/templates/app_layout'),
  el: '[role="application"]',

  behaviors: {},

  regions: {
    library: '.library',
    search: '.search',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function() {
    app = require('application');
  },

  onRender: function() {
    this.showChildView('message', new MessageView());
    this.showChildView('search', new SearchView());
  },
});
