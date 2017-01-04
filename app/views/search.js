'use-strict';

const findWikidataMovieMatches = require('../lib/wikidata_suggestions_film').findMovieMatches;
const template = require('views/templates/search');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  ui: {
    search: 'input',
  },

  events: {
    'typeahead:select @ui.search': 'found',
    'keyup @ui.search': 'processKey',
  },

  initialize: function () {
    this.listenTo(app, 'search:close', this.onEnd);
  },

  onRender: function () {
    this.ui.search.typeahead({
      hint: true,
      highlight: true,
      minLength: 3,
      // limit: 10,
    }, {
      name: 'movie',
      source: _.debounce(findWikidataMovieMatches, 300),
      async: true,
      display: suggestion => suggestion.match.text
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
