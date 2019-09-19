/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


'use strict';

const WalkTreeUtils = require('./walktree_utils');

const get = WalkTreeUtils.get;

const M = {};

/* deprecated */
M.musicbrainzToDeezer = function (album) {
  let uri = `//api.deezer.com/search/album?output=jsonp&callback=?&q=album:"${encodeURIComponent(album.title)}"`;
  if (album.artist) {
    uri += `%20artist:"${encodeURIComponent(album.artist)}"`;
  }

  return $.getJSON(uri).then((res) => {
    const deezerAlbum = get(res, 'data', 0);
    if (!deezerAlbum) { return Promise.resolve(); }
    album.deezerAlbumId = deezerAlbum.id;

    return album;
  });
};

/* deprecated */
M.getAlbumId = function (movie) {
  let uri = '//api.deezer.com/search/album?output=jsonp&callback=?';
  uri += `&q=album:"${encodeURIComponent(movie.originalTitle)}"`;

  // if (film.composer && film.composer.label) {
  //     uri += `%20artist:"${encodeURIComponent(film.composer.label)}"`;
  // }

  return $.getJSON(uri).then((res) => {
    const album = get(res, 'data', 0);
    if (!album) { return Promise.resolve(movie); }

    const soundtrack = {
      deezerAlbumId: album.id,
    };

    // TODO: mix with musicbrainz soundtrack, ...
    movie.soundtracks = [soundtrack];
    return movie;
  });
};

/* depreacteed */
M.getTraklist = function (soundtrack) {
  return $.getJSON(`//api.deezer.com/album/${soundtrack.deezerAlbumId}/tracks/?output=jsonp&callback=?`)
  .then((res) => {
    soundtrack.tracks = res.data;
  });
};

/* deprecated */
M.musicbrainz2DeezerAlbum = function (soundtrack) {
  let uri = '//api.deezer.com/search/album?output=jsonp&callback=?';
  uri += `&q=album:"${encodeURIComponent(soundtrack.title)}"`;
  uri += ` label:"${encodeURIComponent(soundtrack.musicLabel)}"`;

  // if (film.composer && film.composer.label) {
  //     uri += `%20artist:"${encodeURIComponent(film.composer.label)}"`;
  // }

  return $.getJSON(uri).then((res) => {
    const album = get(res, 'data', 0);
    if (!album) { return; }

    soundtrack.deezerAlbumId = album.id;
  });
};

M.musicbrainz2DeezerTrack = function (track, album) {
  let params = {
    track: track.title.replace(/(Theme.*)/, ''),
    artist: track.artist,
  };

  if (track.artist === '[no artist]' || track.artist === '[dialogue]') {
    delete params.artist;
    params.album = album.title;
  }

  params = _.pairs(params).map(kv => `${kv[0]}:"${kv[1]}"`).join(' ');
  params = encodeURIComponent(params);
  return cozy.client.fetchJSON('GET', `/remote/com.deezer.api.track?q=${params}`)
  .then(res => ((typeof res === 'string') ? JSON.parse(res) : res))
  .then((res) => {
    // Sort by title proximity
    const tracks = res.data.sort((trackA, trackB) => {
      return titleDistance(trackA.title, track.title) - titleDistance(trackB.title, track.title);
    });
    const deezerTrack = tracks[0];
    // exclude too different track titles.
    if (deezerTrack && titleDistance(deezerTrack.title, track.title) < track.title.length / 3
      && deezerTrack.title.length > track.title.length / 3) {
      track.deezerId = deezerTrack.id;
    } else {
      console.info(`Track: ${track.title} not found`);
    }
  }).catch(res => console.warn(res));
};

function titleDistance(a, b) {
  // compare string of same length.
  if (a.length > b.length) {
    a = a.slice(0, b.length);
  } else {
    b = b.slice(0, a.length);
  }
  return Levenshtein.get(a, b);
}


M.getTracksId = function (movie) {
  const album = movie.soundtrack;
  const toFind = album.tracks.filter(track => !track.deezerId);
  return Promise.all(toFind.map(track => M.musicbrainz2DeezerTrack(track, album)))
  .then(() => movie);
};

/* deprecated */
M.getSoundtracks = function (movie) {
  return M.musicbrainz2DeezerAlbum(movie.soundtrack)
  .then(() => movie);
};

module.exports = M;
