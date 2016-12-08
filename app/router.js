var app = undefined

module.exports = Backbone.Router.extend({
    routes: {
        '': 'index',
    },

    initialize: function() {
      app = require('application');
    },


    });
