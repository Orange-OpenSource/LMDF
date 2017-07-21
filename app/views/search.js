'use-strict';

const template = require('views/templates/search');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  ui: {
    search: 'input',
    submit: '.submit',
  },

  events: {
    'typeahead:select @ui.search': 'onSubmit',
    'keyup @ui.search': 'processKey',
    'click @ui.submit': 'onSubmit',
  },

  initialize: function () {
    this.listenTo(app, 'search:close', this.onEnd);
  },

  onRender: function () {
    this.ui.search.typeahead({
      hint: true,
      highlight: true,
      minLength: 3,
    }, {
      name: 'label',
      source: app.bloodhound,
      display: 'label',
    });
  },

  onSubmit: function () {
    app.trigger('search', { q: this.ui.search.val() });
  },

  onEnd: function () {
    this.ui.search.typeahead('val', '');
  },

  found: function (ev, suggestion) {
    app.trigger('search', {
      q: this.ui.search.val(),
      selected: suggestion,
    });
  },

  processKey: function (e) {
    if (e.which === 13) {
      this.onSubmit();
    }
  },
});
