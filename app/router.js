'use-strict';

module.exports = Backbone.Router.extend({
  routes: {
    '': 'index',
    testalgos: 'testAlgos',
  },

  testAlgos: function () {
    console.log('toto');
    // eslint-disable-next-line
    require("lib/test_lmdmf_algos").testAlgos();
  },
});
