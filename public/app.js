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
  comparator: movie => movie.getTitle(),

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
      const movie = this.find(movie => movie.get('orangeTitle') === videoStream.title);

      if (movie) {
        return movie;
      }
      return Movie.fromOrangeTitle(videoStream.title);
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
        && doc.fromOffer !== 'AVSP TV LIVE' && doc.fromOffer !== 'OTV'
        && !(doc.subTitle && doc.subTitle !== '')) {
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
      console.error(msg);
      console.error(err);
      // Fail silently
    });
  },


  fromKeyword: function (keyword) {
    return WikidataSuggestions.fetchMoviesSuggestions(keyword)
    .then((suggestions) => {
      AsyncPromise.series(suggestions, this.fromWDSuggestionMovie, this);
    }).catch(err => console.error(err)); // Fail silently.
  },
});

});

require.register("lib/appname_version.js", function(exports, require, module) {
'use-strict';

const name = 'lamusiquedemesfilms';
// use brunch-version plugin to populate these.
const version = '0.0.2';

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


M.getSoundtracks = function (movie) {
  // return AsyncPromise.series(movie.soundtracks, M.musicbrainzToDeezer)
  // .then(() => movie);

  return M.getAlbumId(movie);
};

module.exports = M;

});

require.register("lib/musicbrainz.js", function(exports, require, module) {
'use_strict';

const promiseSeries = require('./async_promise').series;
const WalkTreeUtils = require('./walktree_utils');

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
    const filtered = res['release-groups'].filter(item => item.score > 90);
    movie.soundtracks = filtered.map(rg => ({
      title: rg.title,
      musicbrainzReleaseGroupId: rg.id,
      artist: get(rg, 'artist-credits', 0, 'name'),
    }));
    return movie;
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
    movie.soundtracks[0].musicbrainzReleaseGroupId) ? movie : M.getPlayList(movie)
  ).then(M.getRecordings);
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
      ?musicBrainzRGId ?imdbId ?countryOfOrigin ?countryOfOriginLabel
    WHERE {
     wd:${wikidataId} wdt:P31/wdt:P279* wd:Q11424;
    rdfs:label ?label.
    OPTIONAL { wd:${wikidataId} wdt:P1476 ?originalTitle. }
    OPTIONAL { wd:${wikidataId} wdt:P86 ?composer. }
    OPTIONAL { wd:${wikidataId} wdt:P136 ?genre. }
    OPTIONAL { wd:${wikidataId} wdt:P495 ?countryOfOrigin. }
    OPTIONAL { wd:${wikidataId} wdt:P577 ?publicationDate. }
    OPTIONAL { wd:${wikidataId} wdt:P2047 ?duration. }
    OPTIONAL { wd:${wikidataId} wdt:P57 ?director. }
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
    movies[0].wikidataId = wikidataId;
    return movies[0];
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
  getFilmSuggestionObjectAPI(filmTitle, 10).then(nextAsync);
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

let Movie = null;

module.exports = Movie = CozyModel.extend({
  docType: 'Movie'.toLowerCase(),

  getTitle: function () {
    return this.label;
  },

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
});

Movie.fromWDSuggestionMovie = function (wdSuggestion) {
  return Wikidata.getMovieById(wdSuggestion.id)
  // .then(Musicbrainz.getSoundtracks) // TODO: restore musicbrainz.
  .then(Deezer.getSoundtracks)
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
      lable: message.toString(),
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

const PlayerView = require('views/player');
const template = require('./templates/movie_details');

module.exports = Mn.View.extend({
  template: template,

  regions: {
    player: '.player',
  },

  events: {
    'click #save': 'saveMovie',
  },

  triggers: {
    'click .close': 'details:close',
  },

  serializeData: function () {
    const json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
  },

  onRender: function () {
    this.showChildView('player', new PlayerView());
  },

  onDomRefresh: function () {
    this.playSoundtrack();
  },

  saveMovie: function () {
    app.movies.add(this.model);
    this.model.save();
  },

  playSoundtrack: function () {
    const soundtracks = this.model.get('soundtracks');
    if (!soundtracks || soundtracks.length === 0) {
      return app.trigger('error', 'Pas de bande originale');
    }

    app.trigger('play:album', soundtracks[soundtracks.length - 1]);
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

  serializeData: function () {
    const json = this.model.toJSON();
    json.title = this.model.getTitle();
    return json;
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
    if (query.selected) {
      this.collection.fromWDSuggestionMovie(query.selected)
      .then((movie) => {
        if (!movie) { return console.log('no film for this suggestion !'); }
        app.trigger('details:show', movie);
      }).then(() => this.collection.fromKeyword(query.q));
    } else {
      this.collection.fromKeyword(query.q);
    }
  },

  emptyView: Mn.View.extend({ template: emptyViewTemplate, }),
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
    this.listenTo(app, 'search', query => this.ui.query.html(query.q));
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
  template: template,

  initialize: function () {
    this.listenTo(app, 'play:album', this.playAlbum);
  },

  playAlbum: function (album) {
    if (album.deezerAlbumId) {
      this.setDeezerPlay(album.deezerAlbumId, 'album');
    } else {
      return app.trigger('error', "Pas d'ID deezer");
    }
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'false',
      playlist: true,
      width: 600,
      height: 350,
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
    'typeahead:select @ui.search': 'found',
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
      display: suggestion => suggestion.match.text
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

require.register("views/templates/app_layout.jade", function(exports, require, module) {
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
buf.push("<div class=\"moviedetails\"><img" + (jade.attr("src", posterUri, true, false)) + " class=\"poster\"/><div class=\"movieabout\"><h2>" + (jade.escape(null == (jade_interp = label) ? "" : jade_interp)) + "</h2>");
if ( !id)
{
buf.push("<button id=\"save\">Ajouter à la bibliothèque</button>");
}
buf.push("<div class=\"characteristics\"><b>");
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
buf.push("— Vu le&nbsp;");
var last = viewed[viewed.length - 1].timestamp
buf.push(jade.escape(null == (jade_interp = moment(last).format('DD/MM/YYYY')) ? "" : jade_interp));
}
buf.push("</div><div class=\"synopsis\">" + (null == (jade_interp = synopsis) ? "" : jade_interp) + "</div></div></div><hr/><div class=\"soundtracks\"><h3>Musique associée</h3><div class=\"player\"></div></div><div class=\"close\"></div>");}.call(this,"countryOfOrigin" in locals_for_with?locals_for_with.countryOfOrigin:typeof countryOfOrigin!=="undefined"?countryOfOrigin:undefined,"director" in locals_for_with?locals_for_with.director:typeof director!=="undefined"?director:undefined,"duration" in locals_for_with?locals_for_with.duration:typeof duration!=="undefined"?duration:undefined,"genre" in locals_for_with?locals_for_with.genre:typeof genre!=="undefined"?genre:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined,"posterUri" in locals_for_with?locals_for_with.posterUri:typeof posterUri!=="undefined"?posterUri:undefined,"publicationDate" in locals_for_with?locals_for_with.publicationDate:typeof publicationDate!=="undefined"?publicationDate:undefined,"synopsis" in locals_for_with?locals_for_with.synopsis:typeof synopsis!=="undefined"?synopsis:undefined,"viewed" in locals_for_with?locals_for_with.viewed:typeof viewed!=="undefined"?viewed:undefined));;return buf.join("");
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
;var locals_for_with = (locals || {});(function (posterUri, title) {
buf.push("<div class=\"movieitem\"><img" + (jade.attr("src", posterUri, true, false)) + (jade.attr("title", title, true, false)) + "/></div>");}.call(this,"posterUri" in locals_for_with?locals_for_with.posterUri:typeof posterUri!=="undefined"?posterUri:undefined,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined));;return buf.join("");
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

buf.push("<p>Il n'y a aucun film dans votre vidéothèque Cozy !</p><p>Pour en ajouter, vous pouvez<ul><li>Si vous êtes client Livebox Orange, récupérer votre historique de VOD et Replay via en activant le&nbsp;<a href=\"/#apps/konnectors/konnector/orange_vod\" about=\"_blank\">connecteur Orange VOD.</a></li><li>Tout simplement, rechercher et ajouter un film avec la barre de recherche à gauche.</li></ul></p>");;return buf.join("");
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

buf.push("<b>Aucun film trouvé.</b>");;return buf.join("");
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

buf.push("<input type=\"search\" placeholder=\"Ajouter un film ...\" autocomplete=\"off\"/>");;return buf.join("");
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

