'use-strict';

const PlayerView = require('./player_deezer_popup');
const AlbumView = require('./album');
const template = require('./templates/movie_details');


module.exports = Mn.View.extend({
  template: template,

  ui: {
    img: 'img.poster',
  },
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

  initialize: function () {
    this.model.fetchSynopsis();
    this.model.fetchSoundtrack()
    .then(() => this.model.fetchDeezerIds());
  },

  serializeData: function () {
    return $.extend(this.model.toJSON(), { runningTasks: this.model.runningTasks });
  },

  onRender: function () {
    this.model.getPoster()
    .then((dataUri) => {
      this.ui.img.attr('src', dataUri);
    });

    if (this.model.has('soundtrack') && this.model.get('soundtrack').tracks) {
      const album = new Backbone.Model(this.model.get('soundtrack'));
      album.set('hasDeezerIds', this.model.hasDeezerIds());

      this.showChildView('soundtrack', new AlbumView({ model: album }));
    }

    if (this.model.hasDeezerIds()) {
      this.showChildView('player', new PlayerView());
    }
  },

  saveMovie: function () {
    app.movies.add(this.model);
    this.model.save();
  },
});
