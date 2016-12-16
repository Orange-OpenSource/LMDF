var findWikidataMovieMatches = require('../lib/wikidata_suggestions_film').findMovieMatches

var app = null;

module.exports = Mn.View.extend({
  tagName: 'div',
  template: require('views/templates/search'),

  ui: {
    search: 'input',
  },

  events: {
    'typeahead:select @ui.search': 'found',
  //   'change @ui.search': '',
  },

  initialize: function() {
    app = require('application');
  },

  onRender: function() {
    this.ui.search.typeahead({
      hint: true,
      highlight: true,
      minLength: 3,
    }, {
      name: 'movie',
      source: _.debounce(findWikidataMovieMatches, 300),
      async: true,
      display: 'label',
    });
  },

  found: function(ev, suggestion) {
    app.trigger('search:foundWDSuggestionsMovie', suggestion);
  },

});
