'use strict'
const AsyncPromise = require('./async_promise');
const WalkTreeUtils = require('./walktree_utils');

const get = WalkTreeUtils.get;


let M = {};

M.musicbrainzToDeezer = function(album) {
  let uri = `https://api.deezer.com/search/album?output=jsonp&callback=?&q=album:"${encodeURIComponent(album.title)}"`;
  if (album.artist) {
    uri += `%20artist:"${encodeURIComponent(album.artist)}"`;
  }

  return $.getJSON(uri).then(res => {
    console.log(res);
    let deezerAlbum = get(res, 'data', 0);
    if (!deezerAlbum) {
        return Promise.resolve();
    }
    album.deezerAlbumId = deezerAlbum.id;

    return album;
  });
};

M.getAlbumId = function(movie) {
  let uri = `https://api.deezer.com/search/album?output=jsonp&callback=?&q=album:"${encodeURIComponent(movie.originalTitle)}"`;
  // if (film.composer && film.composer.label) {
  //     uri += `%20artist:"${encodeURIComponent(film.composer.label)}"`;
  // }
  return $.getJSON(uri).then(res => {
    console.log(res);
    let album = get(res, 'data', 0);
    if (!album) {
        return Promise.resolve();
    }

    let soundtrack = {
      deezerAlbumId: album.id,
    };
    movie.soundtracks = [soundtrack];
    return movie;
    // return M.getTraklist(soundtrack).then(() => movie);
  });
};

M.getTraklist = function(soundtrack) {
  return $.getJSON(`https://api.deezer.com/album/${soundtrack.deezerAlbumId}/tracks/?output=jsonp&callback=?`)
  .then(res => {
      soundtrack.tracks = res.data;
  });
};



M.getSoundtracks = function(movie) {
  // return AsyncPromise.series(movie.soundtracks, M.musicbrainzToDeezer)
  // .then(() => movie);

  return M.getAlbumId(movie);
};

module.exports = M;
