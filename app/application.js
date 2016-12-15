// Main application that create a Mn.Application singleton and
// exposes it.


var Router = require('router');
var AppLayout = require('views/app_layout');


// var Properties = require('models/properties');
require('views/behaviors');

var Application = Mn.Application.extend({

  initialize: function() {
    // this.properties = Properties;
  },

  prepare: function() {
    return Promise.resolve();
  },

  prepareInBackground: function() {
    return this._defineViews();
  },


  _defineViews: function() {
  },

  onBeforeStart: function() {
    this.layout = new AppLayout();
    this.router = new Router();

    if (typeof Object.freeze === 'function') {
      Object.freeze(this);
    }
  },

  onStart: function() {
    this.layout.render();
    // prohibit pushState because URIs mapped from cozy-home rely on fragment
    if (Backbone.history) {
      Backbone.history.start({ pushState: false });
    }
    // TODO : keep this, display always a random details.
    //var randomIndex = Math.floor(Math.random() * this.subsets.size());
    //this.trigger('requestform:setView', this.subsets.at(randomIndex));
    this.trigger('message:error', 'Hello, it should work : /');

  },

});

var application = new Application();

module.exports = application;

document.addEventListener('DOMContentLoaded', function() {
  application.prepare()
    .then(function() { return application.prepareInBackground();})
    .then(application.start.bind(application));
});

