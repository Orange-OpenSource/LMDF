'use strict';

const template = require('./templates/how_it_works');

module.exports = Mn.View.extend({
  className: 'howitworks',
  template: template,

  serializeData: function () {
    // TODO
    return { features: PLD.allItems };
  },
});
