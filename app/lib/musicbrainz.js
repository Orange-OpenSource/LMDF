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


M.getBestRecordings = function (movie) {
// Lister les release-group
// Jusqu'à obtenir un bon resultat, en commençant par les release group avec le plus de relaeses : pour chaque release group, récupérer  l'entity release-group, et vrifier l'imdbid
// pour ce release-group, choisir le recordings le plus vieux / la bonne langue.
  let uri = '//musicbrainz.org/ws/2/release-group/?fmt=json&query=';
  uri += `release:${encodeURIComponent(movie.originalTitle)}%20AND%20type:soundtrack`;


  return $.getJSON(uri)
  .then((res) => { // highlight best release-groups candidates.
    // sort with more releases first, then the best title match first,
    return res['release-groups'].sort((a, b) => {
      return (a.count === b.count) ? b.score - a.score : b.count - a.count;
    });
  })
  .then(d => { console.log(d); return d; })
  .then((releaseGroups) => { // Look in each releasegroup, the one with imdbid.
    return promiseFind(releaseGroups, (releaseGroup) => {
      console.log(releaseGroup);
      return $.getJSON(`//musicbrainz.org/ws/2/release-group/${releaseGroup.id}/?fmt=json&inc=url-rels+releases&status=official`)
      .then((releaseGroup) => {
        const withSameIMDBId = releaseGroup.relations.some(relation => {
          return relation.url.resource === `http://www.imdb.com/title/${movie.imdbId}/`;});

        if (withSameIMDBId) {
          return releaseGroup;
        } else {
          return false;
        }
      });
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
        const yearA = a.date.slice(0, 4);
        const yearB = b.date.slice(0, 4);
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
      return $.getJSON(`//musicbrainz.org/ws/2/release/${release.id}/?fmt=json&inc=recordings`).then((res) => {
        const tracks = get(res, 'media', 0, 'tracks');
        let soundtrack = movie.soundtracks[0];
        soundtrack.tracks = tracks;
        soundtrack.title = res.title;
      });
    })
    .then(() => movie);

  });
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
