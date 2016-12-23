'use_strict'

const promiseSeries = require('./async_promise').series;
const WalkTreeUtils = require('./walktree_utils');

const get = WalkTreeUtils.get;


var M = {};

// Musicbrainz
M.getPlayList = function(movie) {
  let uri = 'https://musicbrainz.org/ws/2/release-group/?fmt=json&query=';
  uri += `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;

  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return $.getJSON(uri)
  .then(function(res) {
    let filtered = res['release-groups'].filter(item => item.score > 90);
    movie.soundtracks = filtered.map((rg) => ({
        title: rg.title,
        musicbrainzReleaseGroupId: rg.id,
        artist: get(rg, 'artist-credits', 0, 'name'),
    }));
    return movie;
  });
}

M.getRecordings = function(movie) {
  return promiseSeries(movie.soundtracks, M.getRecording)
  .then(() => movie);
};


M.getRecording = function(releaseGroup) {
  return $.getJSON(`http://musicbrainz.org/ws/2/recording?fmt=json&query=rgid:${releaseGroup.musicbrainzReleaseGroupId}`)
  .then(function(res) {
    if (res.recordings) {
      releaseGroup.tracks = res.recordings;
    }
    return releaseGroup;
  }).catch(() => releaseGroup);
};


M.getSoundtracks = function(movie) {
  return Promise.resolve(
    (movie.soundtracks && movie.soundtracks[0] &&
    movie.soundtracks[0].musicbrainzReleaseGroupId) ? movie : M.getPlayList(movie)
  )
  .then(M.getRecordings);
};

module.exports = M;
