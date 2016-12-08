var MessageView = require('views/message');

var app = undefined;

module.exports = Mn.View.extend({

  template: require('views/templates/app_layout'),
  el: '[role="application"]',

  behaviors: {},

  regions: {
    library: '.library',
    search: '.searchfilms',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function() {
    app = require('application');
  },

  onRender: function() {
    this.showChildView('message', new MessageView());
  },
});
