'use strict';

const template = require('./templates/how_it_works');

module.exports = Mn.View.extend({
  className: 'howitworks',
  template: template,

  events: {
    // eslint-disable-next-line
    'click #testalgos': () => require("lib/test_lmdmf_algos").testAlgos(),
  },

  serializeData: function () {
    // TODO
    return { features: PLD.allItems };
  },
});
