'use_strict'

const promiseSeries = require('./async_promise').series;

var M = {};

// Musicbrainz
M.getPlayList = function(movie) {
  let uri = 'https://musicbrainz.org/ws/2/release-group/?fmt=json&query=';
  uri += `release:${encodeURIComponent(movie.title)}%20AND%20type:soundtrack`;

  if (movie.composer && movie.composer.label) {
      uri += `%20AND%20artistname:${movie.composer.label}`;
  }

  return $.getJSON(uri)
  .then(function(res) {
    console.log(res);
    let filtered = res['release-groups'].filter(item => item.score > 90);
    movie.soundtracks = filtered.map((rg) => ({
        title: rg.title,
        musicbrainzReleaseGroupId: rg.id,
    }));
    return movie;
  });
}

M.getRecordings = function(movie) {
  return promiseSeries(movie.soundtracks, M.getRecording)
  .then(() => movie);
  //   .then(function(recording) {
  //     console.log(tracks);
  //     film.boTracks = tracks;
  //     return Promise.resolve();
  // });
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
