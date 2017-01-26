'use_strict';

const AsyncPromise = require('./async_promise');
const WalkTreeUtils = require('./walktree_utils');

const promiseSeries = AsyncPromise.series;
const promiseFind = AsyncPromise.find;
const get = WalkTreeUtils.get;


const M = {};

// Musicbrainz
M.getPlayList = function (movie) {
  let uri = '//musicbrainz.org/ws/2/release-group/?fmt=json&query=';
  uri += `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;

  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return $.getJSON(uri)
  .then((res) => {
    console.log(res);
    const filtered = res['release-groups'].filter(item => item.score > 90);
    movie.soundtracks = filtered.map(rg => ({
      title: rg.title,
      musicbrainzReleaseGroupId: rg.id,
      artist: get(rg, 'artist-credits', 0, 'artist', 'name'),
    }));
    return movie;
  });
};

M._getReleaseGroupById = function(rgId) {
  return $.getJSON(`//musicbrainz.org/ws/2/release-group/${rgId}/?fmt=json&inc=url-rels+releases&status=official`);
};

M._findReleaseGroup = function(movie) {
  // Find the release group with the same imdbId.

  let uri = '//musicbrainz.org/ws/2/release-group/?fmt=json&query=';
  uri += `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;

  // Doesnt work : always empty result...
  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return $.getJSON(uri)
  .then((res) => { // highlight best release-groups candidates.
    return res['release-groups'].sort((a, b) => {
      if (a.score > 90 || b.score > 90) {
        return (a.score === b.score) ? b.count - a.count : b.score - a.score;
      } else {
        // sort with more releases first, then the best title match first,
        return (a.count === b.count) ? b.score - a.score : b.count - a.count;
      }
    });
  })
  .then(d => { console.log(d); return d; })
  .then((releaseGroups) => { // Look in each releasegroup, the one with imdbid.
    return promiseFind(releaseGroups, (releaseGroup) => {
      return M._getReleaseGroupById(releaseGroup.id)
      .then((releaseGroup) => {
        const withSameIMDBId = releaseGroup.relations.some(relation => {
          return relation.url.resource === `http://www.imdb.com/title/${movie.imdbId}/`;});

        if (withSameIMDBId) {
          return releaseGroup;
        } else {
          return false;
        }
      });
    }, 1000);
  });
};

M.getBestRecordings = function (movie) {
  return Promise.resolve()//() => {
  .then(() => {
    if (movie.musicBrainzRGId) {
      // console.log('toto');
      return M._getReleaseGroupById(movie.musicBrainzRGId);
    } else {
      return M._findReleaseGroup(movie);
    }
  })
  .then(d => { console.log(d); return d; })
  .then((releaseGroup) => {
    movie.soundtracks = [{
      musicbrainzReleaseGroupId: releaseGroup.id,
      artist: get(releaseGroup, 'artist-credits', 0, 'artist', 'name'),
    }];
    return releaseGroup;
  })
  .then((releaseGroup) => { // choose oldest release, and or right lang.
    const releases = releaseGroup.releases.sort((a, b) => {
      const extractYear = (releaseGroup) => {
        const date = a.date || a['first-release-date'];
        if (date) {
          return a.date.slice(0, 4);
        } else {
          return new Date().getFullYear().toString();
        }
      }
      const yearA = extractYear(a);
      const yearB = extractYear(b);
      if (yearA < yearB) {
        return -1;
      } else if (yearA > yearB) {
        return 1;
      } else {
        if (a.country === 'FR') {
          return -1
        } else {
          return 1;
        }
      }
    });
    return releases[0];
  })
  .then(d => { console.log(d); return d; })
  .then((release) => { // get recordings for the specified group.
    return $.getJSON(`//musicbrainz.org/ws/2/release/${release.id}/?fmt=json&inc=recordings+artist-credits+labels`).then((res) => {
      const tracks = get(res, 'media', 0, 'tracks');
      let soundtrack = movie.soundtracks[0];
      soundtrack.tracks = tracks;
      soundtrack.title = res.title;
      soundtrack.musicLabel = get(res, 'label-info', 0, 'label', 'name');
    });
  })
  .then(() => movie);
};

M.getRecordings = function (movie) {
  return promiseSeries(movie.soundtracks, M.getRecording)
  .then(() => movie);
};


M.getRecording = function (releaseGroup) {
  return $.getJSON(`//musicbrainz.org/ws/2/recording?fmt=json&query=rgid:${releaseGroup.musicbrainzReleaseGroupId}`)
  .then((res) => {
    if (res.recordings) {
      releaseGroup.tracks = res.recordings;
    }
    return releaseGroup;
  }).catch(() => releaseGroup);
};


M.getSoundtracks = function (movie) {
  return Promise.resolve(
    (movie.soundtracks && movie.soundtracks[0] &&
    movie.soundtracks[0].musicbrainzReleaseGroupId) ? movie : M.getBestRecordings(movie));
    //M.getPlayList(movie)
  // ).then(M.getRecordings);
};

module.exports = M;
