'use_strict';

const AsyncPromise = require('./async_promise');
const WalkTreeUtils = require('./walktree_utils');

const promiseSeries = AsyncPromise.series;
const promiseFind = AsyncPromise.find;
const get = WalkTreeUtils.get;


const M = {};

const DOMAIN = '//cluster015.ovh.net/~fingyqpv/proxy.php?http://musicbrainz-mirror.eu:5000';
// const DOMAIN = '//musicbrainz-mirror.eu:5000'; // NO valid SSL !
// const DOMAIN = '//musicbrainz.org';

const THROTTLING_PERIOD = 100;

// Musicbrainz
M.getPlayList = function (movie) {
  let uri = `${DOMAIN}/ws/2/release-group/?fmt=json&query=`;
  uri += `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;

  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return $.getJSON(uri)
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
  return $.getJSON(`${DOMAIN}/ws/2/release-group/${rgId}/?fmt=json&inc=url-rels+releases&status=official`);
};

M._findReleaseGroup = function (movie) {
  // Find the release group with the same imdbId.
  const title = movie.soundtrack.label || movie.originalTitle;

  let uri = `${DOMAIN}/ws/2/release-group/?fmt=json&query=`;
  uri += `release:${encodeURIComponent(title)}%20AND%20type:soundtrack`;

  // Doesnt work : always empty result...
  // if (movie.composer && movie.composer.label) {
  //     uri += `%20AND%20artistname:${movie.composer.label}`;
  // }

  return $.getJSON(uri)
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
    return $.getJSON(`${DOMAIN}/ws/2/release/${release.id}/?fmt=json&inc=recordings+artist-credits+labels`)
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
  return $.getJSON(`${DOMAIN}/ws/2/recording?fmt=json&query=rgid:${releaseGroup.musicbrainzReleaseGroupId}`)
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
