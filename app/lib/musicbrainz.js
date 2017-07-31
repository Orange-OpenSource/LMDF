'use_strict';

const AsyncPromise = require('./async_promise');
const WalkTreeUtils = require('./walktree_utils');

const promiseSeries = AsyncPromise.series;
const promiseFind = AsyncPromise.find;
const get = WalkTreeUtils.get;


const M = {};

const THROTTLING_PERIOD = 500;

// Musicbrainz
M.getPlayList = function (movie) {
  // const query = `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;
  const query = `release:%22${encodeURIComponent(movie.originalTitle)}%22%20AND%20type:soundtrack`;
  return cozy.client.fetchJSON('GET', `/remote/org.musicbrainz.release-group.search?q=${query}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((res) => {
    const filtered = res['release-groups'].filter(item => item.score > 90);
    movie.soundtracks = filtered.map(rg => ({
      title: rg.title,
      musicbrainzReleaseGroupId: rg.id,
      artist: get(rg, 'artist-credits', 0, 'artist', 'name'),
    }));
    return movie;
  });
};

M._getReleaseGroupById = function (rgId) {
  let params = {
    rgid: rgId,
    inc: 'url-rels+releases',
    status: 'official',
  };
  params = $.param(params);
  return cozy.client.fetchJSON('GET', `/remote/org.musicbrainz.release-group?${params}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res));
};

M._findReleaseGroup = function (movie) {
  // Find the release group with the same imdbId.
  const title = movie.soundtrack.label || movie.originalTitle;

  const query = `release:%22${encodeURIComponent(title)}%22%20AND%20type:soundtrack`;
  // Doesnt work : always empty result...
  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return cozy.client.fetchJSON('GET', `/remote/org.musicbrainz.release-group.search?q=${query}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((res) => { // highlight best release-groups candidates.
    return res['release-groups'].sort((a, b) => {
      if (a.score > 90 || b.score > 90) {
        return (a.score === b.score) ? b.count - a.count : b.score - a.score;
      }

      // sort with more releases first, then the best title match first,
      return (a.count === b.count) ? b.score - a.score : b.count - a.count;
    });
  })
  .then((releaseGroups) => { // Look in each releasegroup, the one with imdbid.
    return promiseFind(releaseGroups, (releaseGroup) => {
      return M._getReleaseGroupById(releaseGroup.id)
      .then((releaseGroup) => {
        const withSameIMDBId = releaseGroup.relations.some(
          relation => relation.url.resource === `http://www.imdb.com/title/${movie.imdbId}/`);

        if (withSameIMDBId) {
          return releaseGroup;
        }
        return false;
      });
    }, THROTTLING_PERIOD).then((found) => {
      if (found === undefined) {
        return Promise.reject("Can't find releaseGroup with corresponding imdbId");
      }
      return found;
    });
  });
};

M.getBestRecording = function (movie) {
  return Promise.resolve()
  .then(() => {
    if (movie.soundtrack.musicbrainzReleaseGroupId) {
      return M._getReleaseGroupById(movie.soundtrack.musicbrainzReleaseGroupId);
    }
    return M._findReleaseGroup(movie);
  })
  .then((releaseGroup) => {
    movie.soundtrack = $.extend(movie.soundtrack, {
      musicbrainzReleaseGroupId: releaseGroup.id,
      artist: get(releaseGroup, 'artist-credits', 0, 'artist', 'name'),
    });
    return releaseGroup;
  })
  .then((releaseGroup) => { // choose oldest release, and or right lang.
    const releases = releaseGroup.releases.sort((a, b) => {
      const extractYear = (rg) => {
        const date = rg.date || rg['first-release-date'];
        return date ? date.slice(0, 4) : new Date().getFullYear().toString();
      };
      const yearA = extractYear(a);
      const yearB = extractYear(b);

      if (yearA === yearB) {
        return (a.country === 'FR') ? -1 : 1;
      }

      return (yearA < yearB) ? -1 : 1;
    });
    return releases[0];
  })
  .then((release) => { // get recordings for the specified group.
    let params = {
      rid: release.id,
      inc: 'recordings+artist-credits+labels',
    };
    params = $.param(params);
    return cozy.client.fetchJSON('GET', `/remote/org.musicbrainz.release?${params}`)
    .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
    .then((res) => {
      const soundtrack = movie.soundtrack;
      let tracks = get(res, 'media', 0, 'tracks');
      tracks = tracks.map(track => ({
        artist: get(track, 'artist-credit', 0, 'artist', 'name'),
        number: track.number,
        musicbrainzId: track.id,
        length: track.length,
        title: track.title,
      }));
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
  return cozy.client.fetchJSON('GET',
    `/remote/org.musicbrainz.recording.search?q=rgid:${releaseGroup.musicbrainzReleaseGroupId}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((res) => {
    if (res.recordings) {
      releaseGroup.tracks = res.recordings;
    }
    return releaseGroup;
  }).catch(() => releaseGroup);
};


M.getSoundtrack = function (movie) {
  return M.getBestRecording(movie);
  // return Promise.resolve(
  //   movie.soundtrack.musicbrainzReleaseGroupId ? movie : M.getBestRecording(movie));
};

module.exports = M;
