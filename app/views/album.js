'use-strict';

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',


  serializeData: function() {
    const json = this.model.toJSON();
    json.tracks.forEach(track => {
      if (track['artist-credit']) {

      track.artists = track['artist-credit'].map(obj => obj.artist.name).join(', ');
    } else {
      track.artists = '';
    }
    });
    console.log(json);
    return json;
  },
});