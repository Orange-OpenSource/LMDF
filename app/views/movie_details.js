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
    console.log(JSON.stringify(this.model.attributes));
    this.model.fetchSynopsis();
    // console.log(JSON.stringify(this.model.attributes));
    this.model.fetchSoundtrack()
    .then(() => this.model.fetchDeezerIds());
    // console.log(JSON.stringify(this.model.attributes));
    console.log(JSON.stringify(this.model.runningTasks));
  },

  serializeData: function() {
    return $.extend(this.model.toJSON(), { runningTasks: this.model.runningTasks })
  },

  onRender: function () {
    console.log('render');
    // TODO : some spinners !
    // app.trigger('message:display', `Recherche de la bande originale de ${this.model.get('label')}`, 'search_ost');
    // .then((soundtrack) => {
      // app.trigger('message:hide', 'search_ost');

    if (this.model.has('soundtrack') && this.model.get('soundtrack').tracks) {
      console.log('iciiccicici');
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
