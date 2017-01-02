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
    this.listenTo(app, 'message:error', this.onError);
  },

  serializeData: function() {
    return { messages: this.messages  };
  },

  onError: function(message) {
    console.error(message);
    this.display({
      label: message.toString(),
      type: 'error',
      message: message,
    }, Math.ceil(Math.random() * 10000));
  },

  onDisplay: function(message, id) {
    this.display({
      type: 'info',
      lable: message.toString(),
      message: message,
    }, id);
  },

  display: function(message, id) {
    console.debug(message);
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
