'use-strict';

const PlayerView = require('./player');
const AlbumView = require('./album');
const template = require('./templates/movie_details');


module.exports = Mn.View.extend({
  template: template,

  regions: {
    player: {
      el: '.player',
      replaceElement: true,
    },
    soundtrack: {
      el: '.soundtrack > .album',
      replaceElement: true,
    },
  },

  events: {
    'click #save': 'saveMovie',
    'click #play': 'playSoundtrack',
  },

  modelEvents: {
    change: 'render',
  },

  triggers: {
    'click .close': 'details:close',
  },

  behaviors: {
    Destroy: {},
  },


  onRender: function () {
    // TODO : some spinners !
    app.trigger('message:display', `Recherche de la bande originale de ${this.model.get('label')}`, 'search_ost');
    this.model.getSoundtrack()
    .then((soundtrack) => {
      app.trigger('message:hide', 'search_ost');
      return this.showChildView('soundtrack', new AlbumView({ model: new Backbone.Model(soundtrack), }));
    });
  },

  saveMovie: function () {
    app.movies.add(this.model);
    this.model.save();
  },

  playSoundtrack: function () {
    // TODO: initialize spinner !

    // initialize player
    this.showChildView('player', new PlayerView());
    // Fetch deezer ids
    this.model.getDeezerIds()
    // launch music.
    .then((deezerIds) => {
      app.trigger('play:tracks', deezerIds);
    });
  },
});
