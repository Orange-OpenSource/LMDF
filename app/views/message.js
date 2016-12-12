var app = null;

module.exports = Mn.View.extend({
  tagName: 'div',
  template: require('views/templates/message'),

  ui: {
    message: '.display',
  },
  events: {
    'click .close': 'onClose',
  },

  initialize: function() {
    app = require('application');
    this.messages = {};
    this.listenTo(app, 'message:display', this.onDisplay);
    this.listenTo(app, 'message:hide', this.onHide);
    this.listenTo(app, 'message:error', this.onDisplay);
  },

  serializeData: function() {
    return { messages: this.messages  };
  },

  onError: function(message) {
    this.onDisplay(Math.ceil(Math.random() * 10000), message);
  },

  onDisplay: function(id, message) {
    console.log(message);
    this.messages[id] = message;
    this.render();
  },

  onClose: function(ev) {
    this.onHide(ev.currentTarget.dataset.messageid);
  },

  onHide: function(id) {
    delete this.messages[id];

    this.render();

  },

});
