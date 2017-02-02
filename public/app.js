(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = null;
    hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("application.js", function(exports, require, module) {
'use-strict';

// Main application that create a Mn.Application singleton and
// exposes it.
const AsyncPromise = require('./lib/async_promise');
const MoviesCollection = require('./collections/movies');
const Router = require('router');
const AppLayout = require('views/app_layout');
const Properties = require('models/properties');

const bPromise = AsyncPromise.backbone2Promise;


require('views/behaviors');

const Application = Mn.Application.extend({

  prepare: function () {
    this._splashMessages();
    this.movies = new MoviesCollection();
    this.properties = Properties;

    return this.properties.fetch()
    .then(() => this._defineViews())
    .then(() => bPromise(this.movies, this.movies.fetch));
  },

  prepareInBackground: function () {
    return this.movies.addFromVideoStreams()
    .catch(err => this.trigger('message:error', err));
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
  },

  _defineViews: function () {
    this.trigger('message:display', 'Préparation de la liste de film', 'defineviews');
    return Promise.all([
      this.movies.defineMovieAllView(),
      this.movies.defineVideoStreamMoviesByDateView()])
    .then(() => this.trigger('message:hide', 'defineviews'))
    .catch((err) => {
      console.err(err);
      this.trigger('message:error', 'Erreur à la définition des vues.');
    });
  },

  onBeforeStart: function () {
    this.layout = new AppLayout();
    this.router = new Router();

    if (typeof Object.freeze === 'function') {
      Object.freeze(this);
    }
  },

  onStart: function () {
    this.layout.render();
    // prohibit pushState because URIs mapped from cozy-home rely on fragment
    if (Backbone.history) {
      Backbone.history.start({ pushState: false });
    }
    // TODO : keep this, display always a random details.
    // let randomIndex = Math.floor(Math.random() * this.movies.size());
    // this.layout.showMovieDetails(this.movies.at(randomIndex));
  },
});

const application = new Application();

module.exports = application;
window.app = application;

document.addEventListener('DOMContentLoaded', () => {
  application.prepare()
  .catch((err) => {
    const msg = "Erreur pendant la préparation de l'application";
    console.error(msg);
    console.error(err);
    application.trigger('message:error', msg);
  })
  .then(() => application.prepareInBackground())
  .then(() => application.start())
  .catch((err) => {
    const msg = "Erreur au lancement de l'application";
    console.error(msg);
    console.error(err);
    application.trigger('message:error', msg);
  });
});


});

require.register("collections/movies.js", function(exports, require, module) {
'use strict';

const AsyncPromise = require('../lib/async_promise');
const Movie = require('../models/movie');

module.exports = Backbone.Collection.extend({
  model: Movie,
  docType: Movie.prototype.docType.toLowerCase(),
  modelId: attrs => attrs.wikidataId,
  comparator: 'label',

  sync: function (method, collection, options) {
    if (method !== 'read') {
      console.error('Only read is available on this collection.');
      if (options.error) {
        options.error('Only read is available on this collection.');
      }
      return;
    }
    cozysdk.run(this.docType, 'all', { include_docs: true }, (err, results) => {
      if (err) { return options.error(err); }

      return options.success(results.map(res => res.doc));
    });
  },


  addVideoStreamToLibrary: function (videoStream) {
    return Promise.resolve().then(() => {
      const movie = this.find(movie => movie.get('orangeTitle') === videoStream.content.title);

      if (movie) {
        return movie;
      }
      return Movie.fromOrangeTitle(videoStream.content.title);
    }).then((movie) => {
      movie.setViewed(videoStream);
      this.add(movie);

      return movie.save();
    }).catch((err) => {
      // Fail silenlty.
      console.error(err);
      return Promise.resolve();
    });
  },


  addFromVideoStreams: function () {
    const since = app.properties.get('lastVideoStream') || '';
    let last = since;
    return cozysdk.run('videostream', 'moviesByDate',
    { startkey: since, include_docs: true }) // TODO : remove limit !
    .then((results) => {
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult.key > since) {
        last = lastResult.key;
      }

      const videoStreams = results.map(res => res.doc);
      return AsyncPromise.series(videoStreams, this.addVideoStreamToLibrary, this);
    })
    .then(() => {
      app.properties.set('lastVideoStream', last);
      return app.properties.save();
    });
  },


  defineMovieAllView: function () {
    return cozysdk.defineView(this.docType, 'all', 'function(doc) { emit(doc._id); }');
  },


  defineVideoStreamMoviesByDateView: function () {
    const mapFun = function (doc) {
      if (doc.action === 'Visualisation'
        && doc.details.offerName !== 'AVSP TV LIVE' && doc.details.offerName !== 'OTV'
        && !(doc.content.subTitle && doc.content.subTitle !== '')) {
        emit(doc.timestamp);
      }
    };
    return cozysdk.defineView('videostream', 'moviesByDate', mapFun.toString());
  },
});

});

require.register("collections/search_results.js", function(exports, require, module) {
'use strict';

const AsyncPromise = require('../lib/async_promise');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
const Movie = require('../models/movie');


module.exports =
Backbone.Collection.extend({
  model: Movie,
  modelId: attrs => attrs.wikidataId,

  findByWDId: function (wdId) {
    return this.findWhere({ wikidataId: wdId });
  },

  fromWDSuggestionMovie: function (wdSuggestion) {
    const movie = this.findByWDId(wdSuggestion.id);
    if (movie) {
      return Promise.resolve(movie);
    }

    return Movie.fromWDSuggestionMovie(wdSuggestion)
    .then((movie) => {
      this.add(movie);
      return movie;
    }).catch((err) => {
      const msg = `Erreur à la récupération des données pour le film ${wdSuggestion.id}`;
      if (err.message === 'this ID is not a movie') {
        // Fail silently and quitely
        console.info(`Cette entité ${wdSuggestion.id} n'est pas un film.`);
      } else {
        // Fail silently
        console.error(msg);
        console.error(err);
      }
    });
  },


  fromKeyword: function (keyword) {
    return WikidataSuggestions.fetchMoviesSuggestions(keyword)
    .then((suggestions) => {
      return AsyncPromise.series(suggestions, this.fromWDSuggestionMovie, this);
    }).catch(err => console.error(err)); // Fail silently.
  },
});

});

require.register("lib/appname_version.js", function(exports, require, module) {
'use-strict';

const name = 'lamusiquedemesfilms';
// use brunch-version plugin to populate these.
const version = '0.2.2';

module.exports = `${name}-${version}`;

});

require.register("lib/async_promise.js", function(exports, require, module) {
'use-strict';

module.exports.series = function (iterable, callback, self) {
  const results = [];

  return iterable.reduce((sequence, id, index, array) => {
    return sequence.then((res) => {
      results.push(res);
      return callback.call(self, id, index, array);
    });
  }, Promise.resolve(true))
  .then(res => new Promise((resolve) => { // don't handle reject there.
    results.push(res);
    resolve(results.slice(1));
  }));
};

const waitPromise = function (period) {
  return new Promise((resolve) => { // this promise always resolve :)
    setTimeout(resolve, period);
  });
};

module.exports.find = function (iterable, predicate, period) {
  const recursive = (list) => {
    const current = list.shift();
    if (current === undefined) { return Promise.resolve(undefined); }

    return predicate(current)
    .then((res) => {
      if (res === false) {
        return waitPromise(period).then(() => recursive(list));
      }

      return res;
    });
  };

  return recursive(iterable.slice());
};

module.exports.backbone2Promise = function (obj, method, options) {
  return new Promise((resolve, reject) => {
    options = options || {};
    options = $.extend(options, { success: resolve, error: reject });
    method.call(obj, options);
  });
};

});

require.register("lib/backbone_cozymodel.js", function(exports, require, module) {
'use-strict';

const appName = require('../lib/appname_version');

module.exports = Backbone.Model.extend({
  docType: '',
  defaults: {
    docTypeVersion: appName,
  },

  parse: function (raw) {
    raw.id = raw._id;
    return raw;
  },

  sync: function (method, model, options) {
    const callback = (err, res) => {
      return err ? options.error(err) : options.success(res);
    };

    if (method === 'create') {
      return cozysdk.create(this.docType, model.attributes, callback);
    } else if (method === 'update' || method === 'patch') {
      return cozysdk.updateAttributes(this.docType, model.attributes._id, model.attributes, callback);
    } else if (method === 'delete') {
      return cozysdk.destroy(this.docType, model.attributes._id, callback);
    } else if (method === 'read') {
      return cozysdk.find(this.docType, model.attributes._id, callback);
    }
  },
});

});

require.register("lib/backbone_cozysingleton.js", function(exports, require, module) {
'use-strict';

const CozyModel = require('../lib/backbone_cozymodel');

module.exports = CozyModel.extend({
  sync: function (method, model, options) {
    if (method === 'read' && model.isNew()) {
      return cozysdk.defineView(this.docType.toLowerCase(), 'all', 'function(doc) { emit(doc._id);}')
      .then(() => {
        return cozysdk.queryView(this.docType.toLowerCase(), 'all', { limit: 1, include_docs: true });
      })
      .then(res => ((res && res.length !== 0) ? res[0].doc : {}))
      .then(options.success, options.error);
    }

    return CozyModel.prototype.sync.call(this, method, model, options);
  },
});

});

require.register("lib/deezer.js", function(exports, require, module) {
'use strict';

const WalkTreeUtils = require('./walktree_utils');

const get = WalkTreeUtils.get;

const M = {};

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


M.getTraklist = function (soundtrack) {
  return $.getJSON(`//api.deezer.com/album/${soundtrack.deezerAlbumId}/tracks/?output=jsonp&callback=?`)
  .then((res) => {
    soundtrack.tracks = res.data;
  });
};


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
    album: album.title,
    track: track.title,
      // artist: track.artist,
    dur_min: Math.round(track.length / 1000 * 0.9),
    dur_max: Math.round(track.length / 1000 * 1.1),
  };
  params = _.pairs(params).map(kv => `${kv[0]}:"${kv[1]}"`).join(' ');
  return $.getJSON(`//api.deezer.com/search/track/?output=jsonp&callback=?&strict=on&q=${params}`)
  .then((res) => {
    const deezerTrack = res.data[0];
    if (deezerTrack) {
      track.deezerId = deezerTrack.id;
      // track.deezer = deezerTrack;
    } else {
      console.info(`Track: ${track.title} not found`);
    }
  }).catch(res => console.log(res));
};


M.getTracksId = function (album) {
  const toFind = album.tracks.filter(track => !track.deezerId);
  return Promise.all(toFind.map(track => M.musicbrainz2DeezerTrack(track, album)));
};

M.getSoundtracks = function (movie) {
  return M.musicbrainz2DeezerAlbum(movie.soundtrack)
  .then(() => movie);
};

module.exports = M;

});

require.register("lib/musicbrainz.js", function(exports, require, module) {
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

M._getReleaseGroupById = function (rgId) {
  return $.getJSON(`//musicbrainz.org/ws/2/release-group/${rgId}/?fmt=json&inc=url-rels+releases&status=official`);
};

M._findReleaseGroup = function (movie) {
  // Find the release group with the same imdbId.
  const title = movie.soundtrack.label || movie.originalTitle;

  let uri = '//musicbrainz.org/ws/2/release-group/?fmt=json&query=';
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
  // TODO: handle no releaseGroups case.
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
    }, 1000);
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
    return $.getJSON(`//musicbrainz.org/ws/2/release/${release.id}/?fmt=json&inc=recordings+artist-credits+labels`)
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
  return $.getJSON(`//musicbrainz.org/ws/2/recording?fmt=json&query=rgid:${releaseGroup.musicbrainzReleaseGroupId}`)
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

});

require.register("lib/walktree_utils.js", function(exports, require, module) {
'use_strict';

module.exports.get = function (obj, ...prop) {
  return prop.reduce((current, key) => (current ? current[key] : undefined), obj);
};

module.exports.getFirst = function (obj) {
  return obj[Object.keys(obj)[0]];
};

});

require.register("lib/wikidata.js", function(exports, require, module) {
'use-strict';

const M = {};

M.getMovieData = function (wikidataId) {
  const sparql = `SELECT ?label ?wikiLink ?originalTitle ?composer ?composerLabel
      ?genre ?genreLabel ?publicationDate ?duration ?director ?directorLabel
      ?musicBrainzRGId ?imdbId ?countryOfOrigin
      ?countryOfOriginLabel ?countryOfOriginLanguageCode
      ?soundtrack
    WHERE {
     wd:${wikidataId} wdt:P31/wdt:P279* wd:Q11424;
        rdfs:label ?label.

    OPTIONAL { wd:${wikidataId} wdt:P1476 ?originalTitle. }
    OPTIONAL { wd:${wikidataId} wdt:P86 ?composer. }
    OPTIONAL { wd:${wikidataId} wdt:P136 ?genre. }
    FILTER NOT EXISTS { wd:${wikidataId} wdt:P136/wdt:P279* wd:Q291. }
    OPTIONAL { wd:${wikidataId} wdt:P495 ?countryOfOrigin. }
    OPTIONAL {
      wd:${wikidataId} wdt:P495 ?_country.
      ?_country wdt:P37 ?_language.
      ?_language wdt:P218 ?countryOfOriginLanguageCode.
    }
    OPTIONAL { wd:${wikidataId} wdt:P577 ?publicationDate. }
    OPTIONAL { wd:${wikidataId} wdt:P2047 ?duration. }
    OPTIONAL { wd:${wikidataId} wdt:P57 ?director. }
    OPTIONAL {
      wd:${wikidataId} wdt:P406 ?soundtrackAlbum.
      ?soundtrackAlbum wdt:P436 ?musicBrainzRGId.
    }

    OPTIONAL { wd:${wikidataId} wdt:P436 ?musicBrainzRGId. }
    OPTIONAL { wd:${wikidataId} wdt:P345 ?imdbId. }
    OPTIONAL {
      ?wikiLink schema:about wd:${wikidataId}.
      ?wikiLink schema:inLanguage "fr".
      FILTER (SUBSTR(str(?wikiLink), 1, 25) = "https://fr.wikipedia.org/")
    }

    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" . }

    filter langMatches(lang(?label),'fr')
  }
  LIMIT 1`;

  return $.getJSON(wdk.sparqlQuery(sparql))
  .then(wdk.simplifySparqlResults)
  .then((movies) => {
    if (!movies || movies.length === 0) { throw new Error('this ID is not a movie'); }

    const movie = movies[0];

    movie.countryOfOrigin = $.extend({
      languageCode: movie.countryOfOriginLanguageCode,
    }, movie.countryOfOrigin);
    delete movie.countryOfOriginLanguageCode;

    movie.soundtrack = $.extend({
      musicbrainzReleaseGroupId: movie.musicBrainzRGId,
      artist: (movie.composer) ? movie.composer.label : undefined,
    }, movie.soundtrack);
    delete movie.composer;
    delete movie.musicBrainzRGId;

    movie.wikidataId = wikidataId;
    return movie;
  });
};


M.getPoster = function (movie) {
  return $.getJSON(`//www.omdbapi.com/?plot=short&r=json&i=${movie.imdbId}`)
  .then((res) => {
    movie.posterUri = res.Poster;
    return movie;
  }).catch((err) => {
    console.error('Error while geting poster from OMDB: ');
    console.error(err);
    return movie; // Continue on errors.
  });
};


M.getSynopsis = function (movie) {
  if (!movie.wikiLink) {
    console.error("Cant' get synopsys: no wiki link in movie obj.");
    return movie; // continue on errors.
  }

  const params = {
    origin: '*',
    action: 'parse',
    format: 'json',
    prop: 'text',
    section: 1,
    disablelimitreport: 1,
    disableeditsection: 1,
    disabletoc: 1,
  };
  const uri = movie.wikiLink.replace('/wiki/', `/w/api.php?${$.param(params)}&page=`);
  return $.getJSON(uri).then((data) => {
    // TODO: not good enough.
    const html = data.parse.text['*'];
    movie.synopsis = $(html).text();

    return movie;
  });
};


M.getMovieById = function (wikidataId) {
  return M.getMovieData(wikidataId)
  .then(M.getPoster)
  .then(M.getSynopsis);
};


M.prefetchMovieTitle = function (lastMod) {
  const sparql = `SELECT ?item ?itemLabel ?imdbId WHERE {
  ?item wdt:P31/wdt:P279* wd:Q11424;
    wdt:P345 ?imdbId;
    schema:dateModified ?date;
    rdfs:label ?itemLabel.

  FILTER langMatches(lang(?itemLabel),'fr')
  FILTER (?date > "${lastMod}"^^xsd:dateTime)

  }
  `;
  return $.getJSON(wdk.sparqlQuery(sparql))
  .then(wdk.simplifySparqlResults)
  .then(console.log.bind(console));
};

module.exports = M;

// // // // // // // // // // // // // // // // // // // // // // // // // // //

// Walking through object with rest API:
// const WalkTreeUtils = require('./walktree_utils');
//
// const get = WalkTreeUtils.get;
// const getFirst = WalkTreeUtils.getFirst;
//
// // Helper
// function getId(obj, prop) {
//   return get(obj, 'claims', prop, 0, 'mainsnak', 'datavalue', 'value');
// };
//
// var originalTitle = 'P1476';
// var composer = 'P86';
// var genre = 'P136';
// var publicationDate = 'P577';
// var duration = 'P2047';
// var director = 'P57';
// var musicBrainzRGID = 'P436';
// var imdbID = 'P345';
//
// M.getEntityById = function (wikidataId) {
//   return $.getJSON("https://www.wikidata.org/wiki/Special:EntityData/" + wikidataId + ".json")
//   .then(function(res) {
//     var entity = res.entities[wikidataId];
//     if (entity) {
//       return Promise.resolve(entity);
//     } else {
//       return Promise.reject();
//     }
//   });
// };
//
// /* @param movie result from wikidata request */
// M.parseMovie = function (movie) {
//   var props = movie.claims;

//   var obj = {
//     wikidataId: movie.id,
//     composer: get(movie, 'claims', composer, 0, 'mainsnak', 'datavalue', 'value', 'id'),
//     originalTitle: get(movie, 'claims', originalTitle, 0, 'mainsnak', 'datavalue', 'value', 'text'),
//     imdbId: getId(movie, imdbID),
//   };

//   obj.labels = { default: obj.originalTitle };

//   try {
//     var labels = get(movie, 'labels');

//     for (var k in labels) {
//       obj.labels[k] = get(labels, k, 'value');
//     }
//   } catch(e) { console.warn(e); }

//   var musicbrainzReleaseGroupId = get(movie, musicBrainzRGID);
//   if (musicbrainzReleaseGroupId) {
//     obj.musicbrainzReleaseGroupId = [{ musicbrainzReleaseGroupId: musicbrainzReleaseGroupId}];
//   }

//   return obj;
// };

// M.parseComposer = function(composer) {
//   return {
//     label: get(composer, 'labels', 'en', 'value'),
//     wikidataId: composer.id,
//   };
// };
//

// // // // // // // // // // // // // // // // // // // // // // // // // // //

});

;require.register("lib/wikidata_suggestions_film.js", function(exports, require, module) {
'use strict';

// query items with label
module.exports.findMovieMatches = function (filmTitle, nextSync, nextAsync) {
  nextSync();
  getFilmSuggestionObjectAPI(filmTitle, 10)
  .then((items) => {
    items = items.map(item => item.match.text.toLowerCase());
    return Array.from(new Set(items));
  })
  .then(nextAsync);
};

module.exports.fetchMoviesSuggestions = function (title) {
  return getFilmSuggestionObjectAPI(title);
};

function getFilmSuggestionObjectAPI(filmTitle, limit) {
  limit = limit || 50;
  const params = {
    action: 'wbsearchentities',
    search: filmTitle,
    language: 'fr',
    type: 'item',
    limit: limit,
    format: 'json',
    origin: '*',
  };
  return $.getJSON(
    `//www.wikidata.org/w/api.php?${$.param(params)}`)
  .then((res) => {
    const items = res.search.filter(item => item.description &&
       (item.description.indexOf('film') !== -1
       || item.description.indexOf('movie') !== -1));

    // Option: sort instead of filter.
    // let items = res.search.sort((item,itemB) =>
    //   (item.description &&
    //   (item.description.indexOf('film') !== -1
    //   || item.description.indexOf('movie') !== -1)) ? -1 : 1
    //   );

    return Promise.resolve(items);
  });
}

});

;require.register("models/movie.js", function(exports, require, module) {
'use strict';

const CozyModel = require('../lib/backbone_cozymodel');
const Wikidata = require('../lib/wikidata');
const WikidataSuggestions = require('../lib/wikidata_suggestions_film');
const Deezer = require('../lib/deezer');
const Musicbrainz = require('../lib/musicbrainz');


let Movie = null;

module.exports = Movie = CozyModel.extend({
  docType: 'movie',

  setViewed: function (videoStream) {
    const viewed = this.get('viewed') || [];

    if (viewed.some(view => view.timestamp === videoStream.timestamp)) {
      return;
    }

    viewed.push({
      timestamp: videoStream.timestamp,
      videoStreamId: videoStream._id,
      accountType: 'orange',
    });
    this.set('viewed', viewed);
  },

  fetchDetails: function () {
    if (this.has('synopsis')) {
      return Promise.resolve(this);
    }

    return Wikidata.getSynopsis(this.attributes)
    .then((attrs) => {
      // this.set(attrs);
      this.trigger('change:synopsis', attrs.synopsis);
      return this;
    });
  },

  _fetchMusic: function () {
    const attrs = this.attributes;
    return Musicbrainz.getSoundtrack(attrs)
    // .then(Deezer.getSoundtracks)
    .then(() => {
      this.set(attrs);
      if (!this.isNew()) {
        this.save();
      }
      return attrs.soundtrack;
    });
  },

  getSoundtrack: function () {
    const soundtrack = this.get('soundtrack');
    return Promise.resolve(
      soundtrack.tracks ? soundtrack : this._fetchMusic());
  },

  getDeezerIds: function () {
    const soundtrack = this.get('soundtrack');
    if (!soundtrack) {
      return Promise.resolve([]);
    }
    // TODO: handle only the first one now.
    return Deezer.getTracksId(soundtrack)
    .then((changes) => {
      if (changes && changes.length > 0) {
        this.set('soundtrack', soundtrack);
        if (!this.isNew()) {
          this.save();
        }
        // return this.save();
      }
    })
    .then(() => {
      return soundtrack.tracks.map(track => track.deezerId);
    });
  },
});

Movie.fromWDSuggestionMovie = function (wdSuggestion) {
  return Wikidata.getMovieById(wdSuggestion.id)
  .then(attrs => new Movie(attrs))
  ;
};

Movie.fromOrangeTitle = function (title) {
  const prepareTitle = (title) => {
    return title.replace(' - HD', '')
    .replace(/^BA - /, '')
    .replace(/ - extrait exclusif offert$/, '')
    .replace(/ - extrait offert$/, '')
    .replace(/ - édition spéciale$/, '')
    ;
  };

  return fromFrenchTitle(prepareTitle(title))
  .then((movie) => {
    movie.set('orangeTitle', title);
    return movie;
  });
};

function fromFrenchTitle(title) {
  return WikidataSuggestions.fetchMoviesSuggestions(title)
  .then((suggestions) => {
    if (!suggestions || suggestions.length === 0) {
      return Promise.reject(`Can't find Movie with french title: ${title}`);
    }

    // TODO: improve the choice of the suggestion !
    return Movie.fromWDSuggestionMovie(suggestions[0]);
  });
}

});

;require.register("models/properties.js", function(exports, require, module) {
'use-strict';

const CozySingleton = require('../lib/backbone_cozysingleton');

const Properties = CozySingleton.extend({
  docType: 'LaMusiqueDeMesFilmsProperties'.toLowerCase(),
  // TODO: handle since parameter.
});

module.exports = new Properties();

});

require.register("router.js", function(exports, require, module) {
'use-strict';

module.exports = Backbone.Router.extend({
  routes: {
    '': 'index',
  },
});

});

require.register("views/album.js", function(exports, require, module) {
'use-strict';

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  className: 'album',
});

});

require.register("views/app_layout.js", function(exports, require, module) {
'use-strict';

const MessageView = require('views/message');
const DetailsView = require('views/movie_details');
const LibraryView = require('views/movie_library');
const SearchResultsView = require('views/movie_searchresults');
const LeftPanelView = require('views/left_panel');
const template = require('views/templates/app_layout');

module.exports = Mn.View.extend({
  template: template,
  el: '[role="application"]',

  behaviors: {},

  regions: {
    leftpanel: {
      el: 'aside.drawer',
      replaceElement: true,
    },
    searchresults: {
      el: '.searchresults',
      replaceElement: true,
    },
    library: '.library',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function () {
    this.listenTo(app, 'search', this.showSearchResults);
    this.listenTo(app, 'search:close', this.closeSearchResults);
    this.listenTo(app, 'details:show', this.showMovieDetails);
  },

  onRender: function () {
    this.showChildView('message', new MessageView());
    this.showChildView('library', new LibraryView({ collection: app.movies }));
    this.showChildView('leftpanel', new LeftPanelView());
  },

  showMovieDetails: function (movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },

  onChildviewDetailsClose: function () {
    this.getRegion('details').empty();
  },


  showSearchResults: function (query) {
    if (!this.getRegion('searchresults').hasView()) {
      this.getRegion('library').$el.hide();
      this.showChildView('searchresults', new SearchResultsView({
        model: new Backbone.Model(query)
      }));
    }
  },

  closeSearchResults: function () {
    this.getRegion('searchresults').empty();
    this.getRegion('library').$el.show();
  },
});

});

require.register("views/behaviors/destroy.js", function(exports, require, module) {
'use-strict';

module.exports = Mn.Behavior.extend({
  events: {
    'click .delete': 'destroyObject',
  },

  destroyObject: function () {
    if (this.options.onDestroy) {
      this.view[this.options.onDestroy]();
    } else {
      this.view.model.destroy();
    }
  },
});

});

require.register("views/behaviors/index.js", function(exports, require, module) {
'use-strict';

Mn.Behaviors.behaviorsLookup = () => window.Behaviors;

window.Behaviors = {
  //eslint-disable-next-line
  Toggle: require('views/behaviors/toggle'),
  //eslint-disable-next-line
  Destroy: require('views/behaviors/destroy'),
};

});

require.register("views/behaviors/toggle.js", function(exports, require, module) {
'use-strict';

module.exports = Mn.Behavior.extend({
  triggers: {
    'click .toggle': 'toggle',
    'click @ui.toggle': 'toggle',
    'click .contract': 'contract',
    'click @ui.contract': 'contract',
    'click .expand': 'expand',
    'click @ui.expand': 'expand',
  },

  onExpand: function () {
    this.setExpanded(true);
  },

  onContract: function () {
    this.setExpanded(false);
  },

  onToggle: function () {
    this.setExpanded(!(this.$el.attr('aria-expanded') === 'true'));
  },

  setExpanded: function (isExpanded) {
    this.$el.attr('aria-expanded', isExpanded);
  },

  onRender: function () {
    this.onContract();
  },
});

});

require.register("views/left_panel.js", function(exports, require, module) {
'use-strict';

const SearchView = require('views/search');
const template = require('./templates/left_panel');

module.exports = Mn.View.extend({
  tagName: 'aside',
  className: 'drawer',
  template: template,

  behaviors: {
    Toggle: {},
  },

  ui: {},

  triggers: {
    //eslint-disable-next-line
    'click': 'expand',
  },
  regions: {
    search: '.search',
  },

  onRender: function () {
    this.showChildView('search', new SearchView());
    // Listen to toggle from responsive topbar button toggle-drawer.
    $('.toggle-drawer').click(() => this.triggerMethod('toggle'));
  },
});

});

require.register("views/message.js", function(exports, require, module) {
'use-strict';

const template = require('views/templates/message');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  ui: {
    message: '.display',
  },
  events: {
    'click .close': 'onClose',
  },

  initialize: function () {
    this.messages = {};
    this.listenTo(app, 'message:display', this.onDisplay);
    this.listenTo(app, 'message:hide', this.onHide);
    this.listenTo(app, 'message:error', this.onError);
  },

  serializeData: function () {
    return { messages: this.messages };
  },

  onError: function (message) {
    this.display({
      label: message.toString(),
      type: 'error',
      message: message,
    }, Math.ceil(Math.random() * 10000));
  },

  onDisplay: function (message, id) {
    this.display({
      type: 'info',
      label: message.toString(),
      message: message,
    }, id);
  },

  display: function (message, id) {
    this.messages[id] = message;
    this.render();
  },

  onClose: function (ev) {
    this.onHide(ev.currentTarget.dataset.messageid);
  },

  onHide: function (id) {
    delete this.messages[id];
    this.render();
  },
});

});

require.register("views/movie_details.js", function(exports, require, module) {
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
    'click #play': 'playSoundtrack',
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


  onRender: function () {
    // TODO : some spinners !
    app.trigger('message:display', `Recherche de la bande originale de ${this.model.get('label')}`, 'search_ost');
    this.model.getSoundtrack()
    .then((soundtrack) => {
      app.trigger('message:hide', 'search_ost');
      return this.showChildView('soundtrack', new AlbumView({ model: new Backbone.Model(soundtrack), }));
    });
  },

  saveMovie: function () {
    app.movies.add(this.model);
    this.model.save();
  },

  playSoundtrack: function () {
    // TODO: initialize spinner !

    // initialize player
    this.showChildView('player', new PlayerView());
    // Fetch deezer ids
    this.model.getDeezerIds()
    // launch music.
    .then((deezerIds) => {
      app.trigger('play:tracks', deezerIds);
    });
  },
});

});

require.register("views/movie_item.js", function(exports, require, module) {
'use-strict';

const template = require('./templates/movie_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  events: {
    //eslint-disable-next-line
    'click': 'showDetails',
  },

  showDetails: function () {
    app.trigger('details:show', this.model);
  },
});

});

require.register("views/movie_library.js", function(exports, require, module) {
'use strict';

const MovieItemView = require('./movie_item');
const emptyViewTemplate = require('./templates/movie_library_empty');


module.exports = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: MovieItemView,
  emptyView: Mn.View.extend({ template: emptyViewTemplate, }),
});

});

require.register("views/movie_searchresults.js", function(exports, require, module) {
'use-strict';

const MovieItemView = require('./movie_item');
const SearchResultsCollection = require('../collections/search_results');
const template = require('./templates/movie_searchresults');
const emptyViewTemplate = require('./templates/movie_searchresults_empty');

const SearchResultsView = Mn.CollectionView.extend({
  tagName: 'ul',

  className: 'movielibrary',
  childView: MovieItemView,

  initialize: function () {
    this.collection = new SearchResultsCollection();
    this.listenTo(app, 'search', this.onQueryMovie);
  },

  onQueryMovie: function (query) {
    this.collection.reset();
    this.$el.toggleClass('loading', true);
    Promise.resolve().then(() => {
      if (query.selected) {
        return this.collection.fromWDSuggestionMovie(query.selected)
        .then((movie) => {
          if (!movie) { return console.log('no film for this suggestion !'); }
          app.trigger('details:show', movie);
        });
      }
    }).then(() => {
      return this.collection.fromKeyword(query.q);
    }).then(() => {
      this.$el.toggleClass('loading', false);
    });
  },

  emptyView: Mn.View.extend({
    className: 'empty',
    template: emptyViewTemplate,
  }),
});


module.exports = Mn.View.extend({
  className: 'searchresults',
  template: template,

  ui: {
    query: '.query'
  },

  events: {
    'click .close': 'onClose',
  },

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  initialize: function () {
    this.listenTo(app, 'search', this.onSearch);
  },

  onSearch: function (query) {
    this.ui.query.html(query.q);
  },
  onRender: function () {
    const searchResultsView = new SearchResultsView();
    searchResultsView.onQueryMovie(this.model.attributes);
    this.showChildView('collection', searchResultsView);
  },

  onClose: function () {
    app.trigger('search:close');
  },
});

});

require.register("views/player.js", function(exports, require, module) {
'use-strict';

const template = require('views/templates/player');

module.exports = Mn.View.extend({
  tagName: 'div',
  className: 'player',
  template: template,

  initialize: function () {
    this.listenTo(app, 'play:album', this.playAlbum);
    this.listenTo(app, 'play:tracks', this.playTracks);
  },

  playAlbum: function (album) {
    if (album.deezerAlbumId) {
      this.setDeezerPlay(album.deezerAlbumId, 'album');
    } else {
      return app.trigger('error', "Pas d'ID deezer");
    }
  },

  playTracks: function (tracksId) {
    this.setDeezerPlay(tracksId.join(','), 'tracks');
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'true',
      playlist: true,
      width: 600,
      height: 60,
      color: '007FEB',
      layout: 'dark',
      size: 'medium',
      app_id: 1,
      type: type,
      id: id,
    };

    $('#deezerFrame').attr('src', `//www.deezer.com/plugins/player?${$.param(params)}`);
  },
});

});

require.register("views/search.js", function(exports, require, module) {
'use-strict';

const findWikidataMovieMatches = require('../lib/wikidata_suggestions_film').findMovieMatches;
const template = require('views/templates/search');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  ui: {
    search: 'input',
  },

  events: {
    'typeahead:select @ui.search': 'onSubmit',
    'keyup @ui.search': 'processKey',
  },

  initialize: function () {
    this.listenTo(app, 'search:close', this.onEnd);
  },

  onRender: function () {
    this.ui.search.typeahead({
      hint: true,
      highlight: true,
      minLength: 3,
      // limit: 10,
    }, {
      name: 'movie',
      source: _.debounce(findWikidataMovieMatches, 300),
      async: true,
      //display: suggestion => suggestion.match.text
    });
  },

  onSubmit: function () {
    app.trigger('search', { q: this.ui.search.val() });
  },

  onEnd: function () {
    this.ui.search.typeahead('val', '');
  },

  found: function (ev, suggestion) {
    app.trigger('search', {
      q: this.ui.search.val(),
      selected: suggestion,
    });
  },

  processKey: function (e) {
    if (e.which === 13) {
      this.onSubmit();
    }
  },
});

});

require.register("views/soundtracks.js", function(exports, require, module) {
'use strict';

const AlbumView = require('./album');

module.exports = Mn.CollectionView.extend({
  tagName: 'ul',
  // className: 'movielibrary',
  childView: AlbumView,
});

});

require.register("views/templates/album.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (artist, title, tracks, undefined) {
jade_mixins["displayTrack"] = jade_interp = function(track, idx){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li><span class=\"title\">" + (jade.escape(null == (jade_interp = track.title) ? "" : jade_interp)) + "</span>&emsp;par&nbsp;<span class=\"artist\">" + (jade.escape(null == (jade_interp = track.artist) ? "" : jade_interp)) + "</span>&nbsp;<span class=\"length\">" + (jade.escape(null == (jade_interp = moment.utc(track.length).format('mm:ss')) ? "" : jade_interp)) + "</span>&nbsp;</li>");
};
buf.push("<div class=\"albuminfo\"><h3 class=\"title\">" + (jade.escape(null == (jade_interp = title) ? "" : jade_interp)) + "&nbsp;par&nbsp;<span class=\"artist\">" + (jade.escape(null == (jade_interp = artist) ? "" : jade_interp)) + "</span>&emsp;<button id=\"play\">▶ Écouter la bande originale</button></h3></div><ol class=\"tracks\">");
// iterate tracks
;(function(){
  var $$obj = tracks;
  if ('number' == typeof $$obj.length) {

    for (var idx = 0, $$l = $$obj.length; idx < $$l; idx++) {
      var track = $$obj[idx];

jade_mixins["displayTrack"](track, idx);
    }

  } else {
    var $$l = 0;
    for (var idx in $$obj) {
      $$l++;      var track = $$obj[idx];

jade_mixins["displayTrack"](track, idx);
    }

  }
}).call(this);

buf.push("</ol>");}.call(this,"artist" in locals_for_with?locals_for_with.artist:typeof artist!=="undefined"?artist:undefined,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined,"tracks" in locals_for_with?locals_for_with.tracks:typeof tracks!=="undefined"?tracks:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/app_layout.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<aside class=\"drawer\"></aside><div class=\"container\"><nav class=\"topbar\"><button class=\"toggle toggle-drawer\">&nbsp;</button><h1>La musique de mes films</h1></nav><main><section class=\"searchresults\"></section><section class=\"library\"></section></main></div><article class=\"details\"></article><div class=\"message\"></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/left_panel.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"search\"></div><div class=\"tools\">&nbsp;</div><button class=\"toggle\"></button>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/message.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (messages, undefined) {
jade_mixins["displayMessage"] = jade_interp = function(id, m){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li" + (jade.cls([m.type], [true])) + "><span class=\"display\">" + (jade.escape(null == (jade_interp = m.label) ? "" : jade_interp)) + "</span><span" + (jade.attr("data-messageid", id, true, false)) + " class=\"close\">&nbsp;</span></li>");
};
if ( (messages.length != 0))
{
buf.push("<ul>");
// iterate messages
;(function(){
  var $$obj = messages;
  if ('number' == typeof $$obj.length) {

    for (var id = 0, $$l = $$obj.length; id < $$l; id++) {
      var message = $$obj[id];

jade_mixins["displayMessage"](id, message);
    }

  } else {
    var $$l = 0;
    for (var id in $$obj) {
      $$l++;      var message = $$obj[id];

jade_mixins["displayMessage"](id, message);
    }

  }
}).call(this);

buf.push("</ul>");
}}.call(this,"messages" in locals_for_with?locals_for_with.messages:typeof messages!=="undefined"?messages:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/movie_details.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (countryOfOrigin, director, duration, genre, id, label, posterUri, publicationDate, synopsis, viewed) {
buf.push("<div class=\"moviedetails\"><img" + (jade.attr("src", posterUri, true, false)) + " class=\"poster\"/><div class=\"movieabout\"><h2>" + (jade.escape(null == (jade_interp = label) ? "" : jade_interp)) + "</h2><div class=\"characteristics\"><b>");
if ( genre)
{
buf.push((jade.escape(null == (jade_interp = genre.label) ? "" : jade_interp)) + "&ensp;|&ensp;");
}
if ( publicationDate)
{
buf.push((jade.escape(null == (jade_interp = publicationDate.slice(0, 4)) ? "" : jade_interp)) + "&ensp;|&ensp;");
}
if ( countryOfOrigin)
{
buf.push((jade.escape(null == (jade_interp = countryOfOrigin.label) ? "" : jade_interp)) + "&ensp;|&ensp;");
}
if ( duration)
{
buf.push("durée :&#x0020;" + (jade.escape(null == (jade_interp = duration) ? "" : jade_interp)) + "min\n&ensp;|&ensp;");
}
if ( director)
{
buf.push("Réalisé par&nbsp;" + (jade.escape(null == (jade_interp = director.label) ? "" : jade_interp)));
}
buf.push("</b>");
if ( viewed)
{
buf.push("&ensp;— Vu le&nbsp;");
var last = viewed[viewed.length - 1].timestamp
buf.push(jade.escape(null == (jade_interp = moment(last).format('DD/MM/YYYY')) ? "" : jade_interp));
}
buf.push("&ensp;—");
if ( !id)
{
buf.push("<button id=\"save\"> ➕ Ajouter à la bibliothèque</button>");
}
else
{
buf.push("<button class=\"delete\">❌ Supprimer de la bibliothèque</button>");
}
buf.push("</div><div class=\"synopsis\">" + (null == (jade_interp = synopsis) ? "" : jade_interp) + "</div></div></div><hr/><div class=\"soundtrack\"><h3>Musique associée</h3><div class=\"album\"></div><div class=\"player\"></div></div><div class=\"close\"></div>");}.call(this,"countryOfOrigin" in locals_for_with?locals_for_with.countryOfOrigin:typeof countryOfOrigin!=="undefined"?countryOfOrigin:undefined,"director" in locals_for_with?locals_for_with.director:typeof director!=="undefined"?director:undefined,"duration" in locals_for_with?locals_for_with.duration:typeof duration!=="undefined"?duration:undefined,"genre" in locals_for_with?locals_for_with.genre:typeof genre!=="undefined"?genre:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined,"posterUri" in locals_for_with?locals_for_with.posterUri:typeof posterUri!=="undefined"?posterUri:undefined,"publicationDate" in locals_for_with?locals_for_with.publicationDate:typeof publicationDate!=="undefined"?publicationDate:undefined,"synopsis" in locals_for_with?locals_for_with.synopsis:typeof synopsis!=="undefined"?synopsis:undefined,"viewed" in locals_for_with?locals_for_with.viewed:typeof viewed!=="undefined"?viewed:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/movie_item.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (label, posterUri) {
buf.push("<div class=\"movieitem\"><img" + (jade.attr("src", posterUri, true, false)) + (jade.attr("title", label, true, false)) + "/></div>");}.call(this,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined,"posterUri" in locals_for_with?locals_for_with.posterUri:typeof posterUri!=="undefined"?posterUri:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/movie_library_empty.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<p>Il n'y a aucun film dans votre vidéothèque Cozy !</p><p>Pour en ajouter, vous pouvez<ul><li>Si vous êtes client Livebox Orange, récupérer votre historique de VOD et Replay via en activant le&nbsp;<a href=\"/#apps/konnectors/konnector/orange_vod\" target=\"_blank\">connecteur Orange VOD.</a></li><li>Tout simplement, rechercher et ajouter un film avec la barre de recherche à gauche.</li></ul></p>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/movie_searchresults.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (q) {
buf.push("<h2>Résultats pour : «<span class=\"query\">" + (jade.escape(null == (jade_interp = q) ? "" : jade_interp)) + "</span>»</h2><div class=\"close\"></div><ul></ul>");}.call(this,"q" in locals_for_with?locals_for_with.q:typeof q!=="undefined"?q:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/movie_searchresults_empty.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<p>b Aucun film trouvé.</p><p>Attention, cette version n'est capable de rechercher que des films de cinéma, mais les séries devraient arriver dans une prochaine version !</p>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/player.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<iframe id=\"deezerFrame\" scrolling=\"no\" frameborder=\"0\" allowTransparency=\"true\" width=\"600\" height=\"500\"></iframe>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/search.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<input type=\"search\" placeholder=\"Rechercher un film ...\" autocomplete=\"off\"/>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

