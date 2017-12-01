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
const Router = require('router');
const AppLayout = require('views/app_layout');

const AppNameVersion = require('lib/appname_version');
const VersionsMigrations = require('versionsmigrations');
const Properties = require('models/properties');
const MoviesCollection = require('./collections/movies');
const TVSeriesCollection = require('./collections/tvseries');
const VideoStreamsCollection = require('./collections/videostreams');

require('views/behaviors');

const Application = Mn.Application.extend({

  prepare: function () {
    this._splashMessages();
    moment.locale('fr');
    const appElem = $('[role=application]')[0];

    this.cozyDomain = appElem.dataset.cozyDomain;
    cozy.client.init({
      cozyURL: `//${this.cozyDomain}`,
      token: appElem.dataset.cozyToken,
    });

    this.movies = new MoviesCollection();
    this.tvseries = new TVSeriesCollection();
    this.videoStreams = new VideoStreamsCollection();
    this.properties = Properties;
    this._initBloodhound();
    return this.properties.fetch()
    .then(() => Promise.all([
      this.videoStreams.fetch(),
      this.movies.fetch(),
      this.tvseries.fetch(),
      $.getJSON('data/how_it_works.json').then((data) => { PLD.allItems = data; }),
    ]));
  },

  upgrade: function () {
    const lastRunVersion = this.properties.get('appVersion');
    const curVersion = AppNameVersion.split('-', 2)[1];

    if (lastRunVersion !== curVersion) {
      // Is newer version !! Do something !!
      this.trigger('message:display', "Mise à jour vers la nouvelle version de l'application", 'appversionmigration');

      return VersionsMigrations.runMigration(lastRunVersion, curVersion)
      .then(() => {
        this.properties.set('appVersion', curVersion);
        this.trigger('message:hide', 'appversionmigration');
        return this.properties.save();
      });
    }

    return Promise.resolve();
  },

  prepareInBackground: function () {
    cozyUsetracker()
    .catch(err => console.warn('Error while initializing tracking.', err))
    .then(() => cozy.bar.init({ appName: 'La musique de mes films' }));

    this.trigger('message:display',
      'Ajout des films et séries visionnés via VoD et Replay sur Livebox ...', 'findAudioVisualWorks');
    this.videoStreams.findAudioVisualWorks()
    .catch((err) => {
      console.error('Error in prepare in background', err);
      this.trigger('message:error', err);
    })
    .then(() => this.trigger('message:hide', 'findAudioVisualWorks'));

    return Promise.resolve();
  },

  _splashMessages: function () {
    this.listenTo(this, 'message:display message:error',
      message => $('#splashmessage').html(message));
  },

  _initBloodhound: function () {
    this.bloodhound = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('label'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      identify: item => item.id,
      prefetch: {
        url: 'data/wikidata_movie_tvserie_labels.json',
        cache: false,
        //cacheKey: 'M',
      },
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
  .then(() => application.upgrade())
  .then(() => application.start())
  .then(() => application.prepareInBackground())
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

const CozyCollection = require('../lib/backbone_cozycollection');

const Movie = require('../models/movie');

module.exports = CozyCollection.extend({
  model: Movie,
  modelId: attrs => (attrs.wikidataId ? attrs.wikidataId : attrs.label),
  comparator: 'label',
});

});

require.register("collections/search_results.js", function(exports, require, module) {
'use strict';

const WikidataSuggestions = require('../lib/wikidata_suggestions');
const Model = require('../models/audiovisualwork');

module.exports = Backbone.Collection.extend({
  model: Model,
  modelId: attrs => attrs.wikidataId,

  findByWDId: function (wdId) {
    return this.findWhere({ wikidataId: wdId });
  },

  fromWDSuggestionMovie: function (wdSuggestion) {
    const avw = this.findByWDId(wdSuggestion.id);
    if (avw) {
      return Promise.resolve(avw);
    }

    return Model.fromWDSuggestion(wdSuggestion)
    .then((avw) => {
      this.add(avw);
      return avw;
    }).catch((err) => {
      const msg = `Erreur à la récupération des données pour le programme ${wdSuggestion.id}`;
      if (err.message === 'this ID is neither a movie nor a tv serie') {
        // Fail silently and quitely
        console.info(`Cette entité ${wdSuggestion.id} n'est pas ni un film, ni un série.`);
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
      return funpromise.series(suggestions, this.fromWDSuggestionMovie.bind(this));
    }).catch(err => console.error(err)) // Fail silently.
    .then(() => this.trigger('done'));
  },
});

});

require.register("collections/tvseries.js", function(exports, require, module) {
'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');
const Model = require('../models/tvserie');

module.exports = CozyCollection.extend({
  model: Model,
  modelId: attrs => (attrs.wikidataId ? attrs.wikidataId : attrs.label),
  comparator: 'label',
});

});

require.register("collections/videostreams.js", function(exports, require, module) {
'use strict';

const CozyCollection = require('../lib/backbone_cozycollection');
const Model = require('../models/videostream');

module.exports = CozyCollection.extend({
  model: Model,
  comparator: (a, b) => {
    return (a.get('timestamp') > b.get('timestamp')) ? -1 : 1;
  },

  findAudioVisualWork: function (videoStream) {
    return videoStream.findAudioVisualWork()
    .then((avw) => {
      avw.setViewed(videoStream);
      return avw.save();
    })
    .then(() => videoStream.trigger('change'))
    .catch((err) => {
      // Fail silenlty.
      console.error(err);
      return Promise.resolve();
    });
  },

  findAudioVisualWorks: function () {
    // const since = '';
    const since = app.properties.get('lastVideoStream') || '';
    const videoStreams = this.filter(vs => vs.get('timestamp') > since);
    return funpromise.series(videoStreams, this.findAudioVisualWork.bind(this))
    .then(() => {
      app.properties.set('lastVideoStream', this.size() > 0 ? this.first().get('timestamp') : '');
      return app.properties.save();
    });
  },
});

});

require.register("lib/appname_version.js", function(exports, require, module) {
'use-strict';

const name = 'lamusiquedemesfilms';
// use brunch-version plugin to populate these.
const version = '3.0.11';

module.exports = `${name}-${version}`;

});

require.register("lib/backbone_cozycollection.js", function(exports, require, module) {
module.exports = Backbone.Collection.extend({

  getFetchIndex: () => ['_id'],

  getFetchQuery: () => ({ selector: { _id: { $gt: null } } }),

  sync: function (method, collection, options) {
    if (method !== 'read') {
      console.error('Only read is available on this collection.');
      if (options.error) {
        options.error('Only read is available on this collection.');
      }
      return;
    }

    //eslint-disable-next-line
    const docType = new this.model().docType.toLowerCase();

    return cozy.client.data.defineIndex(docType, this.getFetchIndex())
    .then(index => funpromise.queryPaginated((skip) => {
      const params = this.getFetchQuery();
      params.skip = skip;
      params.wholeResponse = true;
      return cozy.client.data.query(index, params);
    }))
    .then(options.success, options.error);
  },
});

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
    return this.syncPromise(method, model, options)
    .then(options.success, (err) => {
      console.error(err);
      options.error(err);
    });
  },

  syncPromise: function (method, model) {
    if (method === 'create') {
      return cozy.client.data.create(this.docType, model.attributes);
    } else if (method === 'update') {
      // TODO !!
      return cozy.client.data.update(this.docType, model.attributes, model.attributes);
    } else if (method === 'patch') {
      // TODO !!
      return cozy.client.data.updateAttributes(this.docType, model.attributes_id, model.attributes);
    } else if (method === 'delete') {
      return cozy.client.data.delete(this.docType, model.attributes);
    } else if (method === 'read') {
      return cozy.client.find(this.docType, model.attributes._id);
    }
  },

  getDocType: function () {
    return Object.getPrototypeOf(this).docType;
  }
});

});

require.register("lib/backbone_cozysingleton.js", function(exports, require, module) {
'use-strict';

const CozyModel = require('./backbone_cozymodel');

module.exports = CozyModel.extend({

  sync: function (method, model, options) {
    if (method === 'read' && model.isNew()) {
      return cozy.client.data.defineIndex(this.docType.toLowerCase(), ['_id'])
      .then((index) => {
        return cozy.client.data.query(index, { selector: { _id: { $gt: null } }, limit: 1 });
      })
      .then(res => ((res && res.length !== 0) ? res[0] : {}))
      .then(options.success, (err) => {
        console.error(err);
        return options.error(err);
      });
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

});

require.register("lib/img_fetcher.js", function(exports, require, module) {
'use-strict';

const imgs = {};

module.exports = (uri, doctype, options) => {
  if (!(uri in imgs)) {
    imgs[uri] = new Promise((resolve, reject) => {
      Promise.all([
        cozy.client.authorize(),
        cozy.client.fullpath(`/remote/${doctype}?${options.params}`),
      ]).then((res) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', res[1]);
        xhr.setRequestHeader('Authorization', res[0].token.toAuthHeader());
        xhr.responseType = 'arraybuffer';
        xhr.onload = (e) => {
          if (xhr.status === 200) {
            resolve(base64ArrayBuffer(e.currentTarget.response));
          } else {
            reject(xhr.statusText);
          }
        };

        xhr.send();
      });
    });
  }

  return imgs[uri];
};


/* eslint-disable */
function base64ArrayBuffer(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}
/* eslint-enable */

});

;require.register("lib/musicbrainz.js", function(exports, require, module) {
'use_strict';

const WalkTreeUtils = require('./walktree_utils');

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
    return funpromise.find(releaseGroups, (releaseGroup) => {
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
      if (found === undefined && releaseGroups[0] && movie.type === 'tvserie') {
        return M._getReleaseGroupById(releaseGroups[0].id);
      }

      return found;
    });
  })
  .then((found) => {
    if (found === undefined) {
      return Promise.reject("Can't find releaseGroup with corresponding imdbId");
    }
    return found;
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
  return funpromise.series(movie.soundtracks, M.getRecording)
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

});

require.register("lib/test_lmdmf_algos.js", function(exports, require, module) {
/* eslint-disable */
const WikidataSuggestions = require('lib/wikidata_suggestions');
const AudioVisualWork = require('models/audiovisualwork');

module.exports = {
  testAlgos: function () {
    app.trigger('message:display', 'Chargement du test, cela prendra quelques minutes.', 'testloading');
    const titles = [
      'American Graffiti',
      'Kill Bill 1',
      'Kill Bill 2',
      // NO musicbrainz
      'Le dernier des mohicans',
      'Alamo',
      // NO musicbrainz
      'The Mission',
      "Il était une fois dans l'ouest",
      'Le bon, la brute et le truand',
      'True Romance',
      'Orange mécanique',
      "2001, L'Odyssée de l'espace",
      "2010 : L'Année du premier contact",
      'Amadeus',
      'La panthère rose',

      "Dr House",
      "Mad Men",
      "Sons of Anarchy",
      "Soprano",
      // NO musicbrainz
      "Stranger things",
      "Six feet under",
      "Breaking bad",
      // NO musicbrainz
      "Peaky blinders",
      "Narcos",
      // NO musicbrainz
      "True detective",
      // NO musicbrainz
      "Deadwood",
      "Braquo",
    ];

    funpromise.series(titles, findAudioVisualWorks, 100)
    .then((awvs) => {
      let html = `<TABLE border=2 cellpadding=10>
        <THEAD>
          <TR>
            <TH>Titre</TH>
            <TH>Wikidata</TH>
            <TH>Synopsys</TH>
            <TH>Musicbrainz</TH>
            <TH>Deezer nb pistes</TH>
            <TH>Musicbrainz nb pistes</TH>
          </TR>
        </THEAD>
        <TBODY>`;

      html += awvs.map((awv, index) => {
        let row = null;
        try {
          row = `<TR data-index='${index}'>
            <TD>${awv.attributes.label}</TD>
            <TD>${!!awv.attributes.wikidataId}</TD>
            <TD>${!!awv.attributes.synopsis}</TD>
            <TD>${awv.attributes.soundtrack && awv.attributes.soundtrack.musicbrainzReleaseGroupId}</TD>
            <TD>${(awv.attributes.soundtrack && awv.attributes.soundtrack.tracks) ? awv.attributes.soundtrack.tracks.filter(track => track.deezerId).length : '-' }</TD>
            <TD>${(awv.attributes.soundtrack && awv.attributes.soundtrack.tracks) ? awv.attributes.soundtrack.tracks.length : '-' }</TD>
          </TR>`;
        } catch (e) {
          console.log(e);
          console.log(awv);
          console.log(index);
          row = `<TR data-index='${index}'><TD>${titles[index]}</TD></TR>`;
        }
        return row;
      }).join('');

      html += '</TBODY></TABLE>';

      app.layout.getRegion('main').$el.html(html);
      $('TR').click(() => app.trigger('details:show', awvs[Number(ev.currentTarget.dataset.index)]));

      app.trigger('message:hide', 'Chargement du test, cela prendra quelques minutes.', 'testloading');
    });
  },
};

findAudioVisualWorks = (name) => {
  let avw = { attributes: { label: name } };
  return new Promise(resolve => app.bloodhound.search(name, resolve))
  .then((suggestions) => {
    if (suggestions.length === 0) {
      return WikidataSuggestions.fetchMoviesSuggestions(name);
    }
    return suggestions;
  })
  .then((suggestions) => {
    if (suggestions.length === 0) {
      return Promise.reject(`${name} not found on wikidata`);
    }
    return AudioVisualWork.fromWDSuggestion(suggestions[0]);
  })
  .then((res) => { avw = res; })
  .then(() => avw.fetchSynopsis())
  .then(() => avw.fetchSoundtrack())
  .then(() => avw.fetchDeezerIds())
  .catch(() => true)
  .then(() => avw);
};
/* eslint-enable */

});

;require.register("lib/walktree_utils.js", function(exports, require, module) {
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

const WalkTreeUtils = require('./walktree_utils');

const getFirst = WalkTreeUtils.getFirst;
const get = WalkTreeUtils.get;

const M = {};

M.getMovieData = function (wikidataId) {
  let sparql = `SELECT ?label ?wikiLink ?wikiLinkFr ?originalTitle ?composer ?composerLabel
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
      ?wikiLinkFr schema:about wd:${wikidataId}.
      ?wikiLinkFr schema:inLanguage "fr".
      FILTER (SUBSTR(str(?wikiLinkFr), 1, 25) = "https://fr.wikipedia.org/")
    }

    OPTIONAL {
      ?wikiLink schema:about wd:${wikidataId}.
      ?wikiLink schema:inLanguage "en".
      FILTER (SUBSTR(str(?wikiLink), 1, 25) = "https://en.wikipedia.org/")
    }

    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" . }

    filter langMatches(lang(?label),'fr')
  }
  LIMIT 1`;


  // return $.getJSON(wdk.sparqlQuery(sparql))
  sparql = encodeURIComponent(sparql);
  return cozy.client.fetchJSON('GET', `/remote/org.wikidata.sparql?q=${sparql}`)
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

M.getTVSerieData = function (wikidataId) {
  let sparql = `SELECT ?label ?wikiLink ?wikiLinkFr ?originalTitle ?composer ?composerLabel
      ?genre ?genreLabel ?publicationDate ?director ?directorLabel
      ?musicBrainzRGId ?imdbId ?countryOfOrigin
      ?countryOfOriginLabel ?countryOfOriginLanguageCode
      ?soundtrack
    WHERE {
     wd:${wikidataId} wdt:P31/wdt:P279* wd:Q5398426;
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
    OPTIONAL { wd:${wikidataId} wdt:P57 ?director. }
    OPTIONAL {
      wd:${wikidataId} wdt:P406 ?soundtrackAlbum.
      ?soundtrackAlbum wdt:P436 ?musicBrainzRGId.
    }

    OPTIONAL { wd:${wikidataId} wdt:P436 ?musicBrainzRGId. }
    OPTIONAL { wd:${wikidataId} wdt:P345 ?imdbId. }
    OPTIONAL {
      ?wikiLinkFr schema:about wd:${wikidataId}.
      ?wikiLinkFr schema:inLanguage "fr".
      FILTER (SUBSTR(str(?wikiLinkFr), 1, 25) = "https://fr.wikipedia.org/")
    }

    OPTIONAL {
      ?wikiLink schema:about wd:${wikidataId}.
      ?wikiLink schema:inLanguage "en".
      FILTER (SUBSTR(str(?wikiLink), 1, 25) = "https://en.wikipedia.org/")
    }

    SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" . }

    filter langMatches(lang(?label),'fr')
  }
  LIMIT 1`;


  // return $.getJSON(wdk.sparqlQuery(sparql))
  sparql = encodeURIComponent(sparql);
  return cozy.client.fetchJSON('GET', `/remote/org.wikidata.sparql?q=${sparql}`)
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

M.getMovieOrTVSerieData = function (wikidataId) {
  let sparql = `SELECT ?label ?wikiLink ?wikiLinkFr ?originalTitle ?composer ?composerLabel
  ?genre ?genreLabel ?publicationDate ?duration ?director ?directorLabel
  ?musicBrainzRGId ?imdbId ?countryOfOrigin
  ?countryOfOriginLabel ?countryOfOriginLanguageCode
  ?soundtrack
  ?isMovie
  WHERE {
    {
      wd:${wikidataId} wdt:P31/wdt:P279* wd:Q11424;
        rdfs:label ?isMovie.
    } UNION {
      wd:${wikidataId} wdt:P31/wdt:P279* wd:Q5398426.
    }
    wd:${wikidataId} rdfs:label ?label.

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
    ?wikiLinkFr schema:about wd:${wikidataId}.
    ?wikiLinkFr schema:inLanguage "fr".
    FILTER (SUBSTR(str(?wikiLinkFr), 1, 25) = "https://fr.wikipedia.org/")
  }

  OPTIONAL {
    ?wikiLink schema:about wd:${wikidataId}.
    ?wikiLink schema:inLanguage "en".
    FILTER (SUBSTR(str(?wikiLink), 1, 25) = "https://en.wikipedia.org/")
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" . }

  filter langMatches(lang(?label),'fr')
  }
  LIMIT 1`;


  // return $.getJSON(wdk.sparqlQuery(sparql))
  sparql = encodeURIComponent(sparql);
  return cozy.client.fetchJSON('GET', `/remote/org.wikidata.sparql?q=${sparql}`)
  .then(wdk.simplifySparqlResults)
  .then((avws) => {
    if (!avws || avws.length === 0) { throw new Error('this ID is nor a movie nor a tvserie'); }

    const avw = avws[0];

    avw.countryOfOrigin = $.extend({
      languageCode: avw.countryOfOriginLanguageCode,
    }, avw.countryOfOrigin);
    delete avw.countryOfOriginLanguageCode;

    avw.soundtrack = $.extend({
      musicbrainzReleaseGroupId: avw.musicBrainzRGId,
      artist: (avw.composer) ? avw.composer.label : undefined,
    }, avw.soundtrack);
    delete avw.composer;
    delete avw.musicBrainzRGId;

    avw.wikidataId = wikidataId;
    return avw;
  });
};


M.getPoster = function (movie) {
  if (typeof (movie.wikiLink) !== 'string') {
    console.error("Cant' get poster: no wiki link in movie obj.");
    movie.posterUri = false;
    return Promise.resolve(movie); // continue on errors.
  }

  const page = movie.wikiLink.replace(/.*\/wiki\//, '');
  return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.en.api.parse.images?page=${page}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((data) => {
    const images = get(data, 'parse', 'images');
    let name;
    // eslint-disable-next-line
    for (name of images) {
      if (name.toLowerCase().indexOf('poster') !== -1) {
        return name;
      }
    }
    return Promise.reject('No image');
  })
  .then((fileName) => {
    const titles = encodeURIComponent(`Image:${fileName}`);
    return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.en.api.query.imageinfo?titles=${titles}`);
  })
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((data) => {
    movie.posterUri = get(getFirst(get(data, 'query', 'pages')), 'imageinfo', 0, 'url');
    return movie;
  })
  .catch((err) => {
    console.warn(err);
    movie.posterUri = false;
    return Promise.resolve(movie);
  })
  ;
};


M.getSynopsis = function (movie) {
  if (typeof (movie.wikiLinkFr) !== 'string') {
    console.error("Cant' get synopsys: no wiki link in movie obj.");
    return Promise.resolve(movie); // continue on errors.
  }

  const params = {
    section: 1,
    disablelimitreport: 1,
    disableeditsection: 1,
    disabletoc: 1,
    page: decodeURIComponent(movie.wikiLinkFr.replace(/.*\/wiki\//, '')),
  };
  return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.fr.api.parse.text?${$.param(params)}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((data) => {
    // TODO: not good enough.
    const html = data.parse.text['*'];
    movie.synopsis = $(html).text();

    return movie;
  });
};


M.getMovieById = function (wikidataId) {
  return M.getMovieData(wikidataId)
  // useless since https://github.com/cozy/cozy-stack/pull/857 broke wikimedia fetch.
  // .then(M.getPoster)
  .then(M.getSynopsis);
};

// obsolete
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
  .then(wdk.simplifySparqlResults);
};

module.exports = M;

// Remote doctypes
// --> org.wikipedia.fr.api
// GET https://fr.wikipedia.org/w/api.php?{{params}}
//
// --> org.wikipedia.en.api
// GET https://en.wikipedia.org/w/api.php?{{params}}
//
// --> org.wikidata.sparql
// GET https://query.wikidata.org/sparql?format=json&query={{q}}
//

// // // // // // // // // // // // // // // // // // // // // // // // // // //

// M.getPoster = function (movie) {
//   return $.getJSON(`//www.omdbapi.com/?plot=short&r=json&i=${movie.imdbId}`)
//   .then((res) => {
//     movie.posterUri = res.Poster;
//     return movie;
//   }).catch((err) => {
//     console.error('Error while geting poster from OMDB: ');
//     console.error(err);
//     return movie; // Continue on errors.
//   });
// };

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

;require.register("lib/wikidata_suggestions.js", function(exports, require, module) {
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
  return Promise.all([
    new Promise(resolve => app.bloodhound.search(title, resolve)),
    getFilmSuggestionObjectAPI(title),
  ])
  .then((results) => {
    let suggestions = results[0].concat(results[1]);
    suggestions = _.uniq(suggestions, s => s.id);
    return suggestions;
  });
};

function getFilmSuggestionObjectAPI(filmTitle, limit) {
  limit = limit || 50;
  let params = {
    search: filmTitle,
    language: 'fr',
    type: 'item',
    limit: limit,
  };

  params = $.param(params);
  return cozy.client.fetchJSON('GET', `/remote/org.wikidata.wbsearchentities?${params}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((res) => {
    // Option:filter.
    // const items = res.search.filter((item) => {
    // Option: sort instead of filter.
    const items = res.search.sort((item) => {
      if (item.description) {
        const description = item.description.toLowerCase();
        return (description.indexOf('film') !== -1
        || description.indexOf('movie') !== -1
        || description.indexOf('tv series') !== -1
        || description.indexOf('television series') !== -1
      // );
        ) ? -1 : 1;
      }
    //   return false;
      return 0;
    });
    return Promise.resolve(items);
  });
}

});

;require.register("models/audiovisualwork.js", function(exports, require, module) {
'use strict';

const CozyModel = require('../lib/backbone_cozymodel');
const Wikidata = require('../lib/wikidata');
const Deezer = require('../lib/deezer');
const Musicbrainz = require('../lib/musicbrainz');
const ImgFetcher = require('lib/img_fetcher');

let AudioVisualWork = null;

module.exports = AudioVisualWork = CozyModel.extend({
  initialize: function () {
    this.runningTasks = {};
  },

  setViewed: function (videoStream) {
    const viewed = this.get('viewed') || [];

    if (viewed.some(view => view.timestamp === videoStream.get('timestamp'))) { return; }

    viewed.push({
      timestamp: videoStream.get('timestamp'),
      videoStreamId: videoStream.get('_id'),
      accountType: 'orange',
    });
    this.set('viewed', viewed);
  },

  setTaskRunning: function (task) {
    this.runningTasks[task] = true;
  },

  setTaskDone: function (task) {
    delete this.runningTasks[task];
  },

  fetchPosterUri: function () {
    return this._runFetch(Wikidata.getPoster, 'posterUri');
  },

  fetchSynopsis: function () {
    return this._runFetch(Wikidata.getSynopsis, 'synopsis');
  },


  _runFetch: function (method, field, options) {
    options = options || {};
    const taskName = options.taskName || field;
    const isFieldReady = options.isFieldReady || (obj => obj.has(field));
    if (isFieldReady(this)) {
      return Promise.resolve(this);
    }

    this.setTaskRunning(`fetch_${taskName}`);
    const attrs = $.extend({}, this.attributes);
    return method(attrs)
    .then((res) => {
      this.set(res);
      if (!this.isNew()) {
        this.save();
      }
      this.setTaskDone(`fetch_${taskName}`);
      this.trigger(`change:${field}`, res[field]);
      this.trigger('change', this);
      return this;
    }).catch((err) => {
      this.setTaskDone(`fetch_${taskName}`);
      this.trigger('change', this);
      return Promise.reject(err);
    });
  },

  fetchSoundtrack: function () {
    return this._runFetch(Musicbrainz.getSoundtrack, 'soundtrack', {
      isFieldReady: obj => obj.has('soundtrack') && obj.get('soundtrack').tracks
    });
  },

  fetchDeezerIds: function () {
    return this._runFetch(Deezer.getTracksId, 'soundtrack', {
      taskName: 'deezerIds',
      isFieldReady: obj => obj.hasDeezerIds(),
    });
  },

  getDeezerIds: function () {
    return this.attributes.soundtrack.tracks.map(track => track.deezerId);
  },

  hasDeezerIds: function () {
    return this.has('soundtrack') && this.attributes.soundtrack.tracks
      && this.attributes.soundtrack.tracks.some(track => track.deezerId);
  },

  getPoster: function () {
    return Promise.resolve().then(() => {
      if (this.has('imdbId')) {
        const params = $.param({
          apikey: 'cbefad9e',
          i: this.get('imdbId'),
          h: 260,
        });
        return ImgFetcher(`https://img.omdbapi.com/?${params}`, 'com.omdbapi.img', { params });
      }

      return Promise.reject("can't fetch poster");
      // Borken with : https://github.com/cozy/cozy-stack/pull/857
      // return (this.has('posterUri') ? Promise.resolve() : this.fetchPosterUri())
      //   .then(() => {
      //     const uri = this.get('posterUri');
      //     if (!uri) { return Promise.reject(); }
      //
      //     const params = `path=${uri.replace(/.*org\//, '')}`;
      //     return ImgFetcher(uri, 'org.wikimedia.uploads', { params });
      //   });
    })
    .then(data => `data:image;base64,${data}`);
  },
});


AudioVisualWork.fromWDSuggestion = function (wdSuggestion) {
  //eslint-disable-next-line
  const Movie = require('./movie');
  //eslint-disable-next-line
  const TVSerie = require('./tvserie');

  return Wikidata.getMovieOrTVSerieData(wdSuggestion.id)
  .then((attrs) => {
    if (attrs.isMovie) {
      delete attrs.isMovie;
      return new Movie(attrs);
    }
    return new TVSerie(attrs);
  });
};

});

require.register("models/movie.js", function(exports, require, module) {
'use strict';

const AudioVisualWork = require('./audiovisualwork');

module.exports = AudioVisualWork.extend({
  docType: 'fr.orange.movie',
  save: function () {
    if (this.isNew()) {
      app.movies.add(this);
    }
    //eslint-disable-next-line
    return AudioVisualWork.prototype.save.call(this, arguments);
  },
});

});

require.register("models/properties.js", function(exports, require, module) {
'use-strict';

const CozySingleton = require('../lib/backbone_cozysingleton');

const Properties = CozySingleton.extend({
  docType: 'fr.orange.lamusiquedemesfilms.properties'
});

module.exports = new Properties();

});

require.register("models/tvserie.js", function(exports, require, module) {
'use strict';

const AudioVisualWork = require('./audiovisualwork');

module.exports = AudioVisualWork.extend({
  docType: 'fr.orange.tvserie',

  defaults: _.extend({ type: 'tvserie' }, AudioVisualWork.defaults),

  save: function () {
    if (this.isNew()) {
      app.tvseries.add(this);
    }
    //eslint-disable-next-line
    return AudioVisualWork.prototype.save.call(this, arguments);
  },
});

});

require.register("models/videostream.js", function(exports, require, module) {
'use strict';

const CozyModel = require('../lib/backbone_cozymodel');
const AudioVisualWork = require('../models/audiovisualwork');
const WikidataSuggestions = require('../lib/wikidata_suggestions');

module.exports = CozyModel.extend({
  docType: 'fr.orange.videostream',

  getAudioVisualWork: function () {
    if (!this.audioVisualWork) {
      const findVideoStream = (movie) => {
        return movie.has('viewed') && _.findWhere(movie.get('viewed'), { videoStreamId: this.get('_id') });
      };
      this.audioVisualWork = app.movies.find(findVideoStream)
        || app.tvseries.find(findVideoStream)
        || null;
              // this.audiovisualWork = app.movies.at(Math.ceil(Math.random() * 50));
    }
    return this.audioVisualWork;
  },

  getName: function () {
    const content = this.get('content');
    if (!content) { return name; }

    // Movies
    if (this.get('action') === 'Visualisation'
     && this.get('details') && this.get('details').offerName !== 'AVSP TV LIVE'
     && this.get('details').offerName !== 'OTV' && !content.subTitle) {
      return content.title.replace(' - HD', '')
        .replace(/^BA - /, '')
        .replace(/ - extrait exclusif offert$/, '')
        .replace(/ - extrait offert$/, '')
        .replace(/ - édition spéciale$/, '')
        ;
    }

    // TODO : is it a good idea ! ?
    // include commande of movies :
    if (!content.subTitle) {
      return content.title.replace(' - HD', '')
        .replace(/^BA - /, '')
        .replace(/ - extrait exclusif offert$/, '')
        .replace(/ - extrait offert$/, '')
        .replace(/ - édition spéciale$/, '')
        ;
    }
    // if (!content.subTitle) { return ''; }

    // series
    // look in subtitle, remove %d - in front, and  - S%d%d at the end.

    return content.subTitle.replace(/^\d+[ ]*-[ ]*/, '')
      .replace(/[ ]*-?[ ]+S\d+$/, '')
      .replace(/[ ]*-[ ]*VOST$/, '')
      .replace(/&/g, ' ')
      ;
  },

  findAudioVisualWork: function () {
    const name = this.getName();
    if (!name) { return Promise.reject('neither a film nor tvserie'); } // TODO

    const avw = app.movies.findWhere({ orangeName: name }) || app.tvseries.findWhere({ orangeName: name });
    if (avw) { return Promise.resolve(avw); }

    return new Promise(resolve => app.bloodhound.search(name, resolve))
    .then((suggestions) => {
      if (suggestions.length === 0) {
        return WikidataSuggestions.fetchMoviesSuggestions(name);
      }
      return suggestions;
    })
    .then((suggestions) => {
      if (suggestions.length === 0) {
        return Promise.reject(`${name} not found on wikidata`);
      }
      return AudioVisualWork.fromWDSuggestion(suggestions[0]);
    }).then((avw) => {
      // The AudioViualWork may already exist in the library.
      avw = app.movies.findWhere({ wikidataId: avw.get('wikidataId') })
        || app.tvseries.findWhere({ wikidataId: avw.get('wikidataId') })
        || avw;

      avw.set('orangeName', name);
      return avw;
    });
  },
});

});

require.register("router.js", function(exports, require, module) {
'use-strict';

module.exports = Backbone.Router.extend({
  routes: {
    '': 'index',
  },
});

});

require.register("versionsmigrations.js", function(exports, require, module) {
module.exports.runMigration = (previous) => { // previous, current
  // TODO : it's ugly, can we factoryse it ?
  if (previous < '3.0.z' && Number(previous.slice(4)) < 10) {
    // re-scan videostreams, by reseting "lastviewed" flag.
    app.properties.set('lastVideoStream', '');
    return app.properties.save();
  }

  return Promise.resolve();
};

});

require.register("views/album.js", function(exports, require, module) {
'use-strict';

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  className: 'album',

  events: {
    'click .track button.play': 'onPlayTrack',
    'click .albuminfo button.play': 'onPlayAlbum',
  },

  onPlayAlbum: function () {
    if (this.model.has('tracks')) {
      app.trigger('play:tracks', this.model.get('tracks').map(track => track.deezerId));
    }
  },

  onPlayTrack: function (ev) {
    app.trigger('play:tracks', [ev.currentTarget.dataset.deezerid]);
  },
});

});

require.register("views/app_layout.js", function(exports, require, module) {
'use-strict';

const MessageView = require('views/message');
const DetailsView = require('views/movie_details');
const MovieLibraryView = require('views/movie_library');
const VideoStreamsView = require('views/videostreams');
const SearchResultsView = require('views/movie_searchresults');
const HowItWorksView = require('views/how_it_works');
const LeftPanelView = require('views/left_panel');
const template = require('views/templates/app_layout');

module.exports = Mn.View.extend({
  template: template,
  el: '[role="application"]',

  behaviors: {},

  ui: {
    mainTitle: 'h1',
  },

  regions: {
    leftpanel: {
      el: 'aside.drawer',
      replaceElement: true,
    },
    main: 'main',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function () {
    this.listenTo(app, 'search', query => this.setMainView('search', query));
    this.listenTo(app, 'library:show', this.setMainView);
    this.listenTo(app, 'mainview:set', this.setMainView);

    this.listenTo(app, 'details:show', this.showMovieDetails);
    this.listenTo(app, 'mainTitle:set', title => this.ui.mainTitle.text(title));
  },

  onRender: function () {
    this.showChildView('message', new MessageView());
    this.setMainView('videostreams'); // default view is videostream.
    this.showChildView('leftpanel', new LeftPanelView());
  },

  showMovieDetails: function (movie) {
    this.showChildView('details', new DetailsView({ model: movie }));
  },

  onChildviewDetailsClose: function () {
    this.getRegion('details').empty();
  },

  setMainView: function (slug, options) {
    if (slug === this.currentMain) return;
    let view = null;
    switch (slug) {
      case 'search':
        view = new SearchResultsView({ model: new Backbone.Model(options.query) });
        break;
      case 'videostreams': view = new VideoStreamsView({ collection: app.videoStreams }); break;
      case 'movies':
        view = new MovieLibraryView({ collection: app.movies, model: new Backbone.Model({ title: 'Mes Fims' }) });
        break;
      case 'tvseries':
        view = new MovieLibraryView({ collection: app.tvseries, model: new Backbone.Model({ title: 'Mes Séries' }) });
        break;
      case 'howitworks':
        view = new HowItWorksView();
        break;

      default: view = null;
    }

    this.getRegion('main').empty();
    this.showChildView('main', view);
    this.currentMain = slug;
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

require.register("views/how_it_works.js", function(exports, require, module) {
'use strict';

const template = require('./templates/how_it_works');

module.exports = Mn.View.extend({
  className: 'howitworks',
  template: template,

  events: {
    // eslint-disable-next-line
    'click #testalgos': () => require("lib/test_lmdmf_algos").testAlgos(),
  },

  serializeData: function () {
    // TODO
    return { features: PLD.allItems };
  },
});

});

require.register("views/left_panel.js", function(exports, require, module) {
'use-strict';

const appName = require('../lib/appname_version');

const SearchView = require('views/search');
const template = require('./templates/left_panel');


module.exports = Mn.View.extend({
  tagName: 'aside',
  className: 'drawer',
  template: template,

  behaviors: {
    Toggle: {},
  },

  ui: {
    libraryOptions: '.selectlibrary li',
    search: '.search',
    howitworks: '.howitworks',
  },

  triggers: {
    //eslint-disable-next-line
    'click': 'expand',
  },

  events: {
    'click @ui.libraryOptions': 'onLibraryChanged',
    'click @ui.howitworks': 'selectCodesign'
  },

  regions: {
    search: '@ui.search',
  },

  serializeData: function () {
    return { appName: appName };
  },
  onRender: function () {
    this.showChildView('search', new SearchView());
    // Listen to toggle from responsive topbar button toggle-drawer.
    $('.toggle-drawer').click(() => this.triggerMethod('toggle'));
  },

  onLibraryChanged: function (ev) {
    this._setSelected(ev);
    const elem = ev.currentTarget;
    app.trigger('library:show', elem.dataset.value);
  },

  selectCodesign: function (ev) {
    this._setSelected(ev);
    app.trigger('mainview:set', 'howitworks');
  },

  _setSelected: function (ev) {
    const elem = ev.currentTarget;
    this.ui.libraryOptions.toggleClass('selected', false);
    this.ui.howitworks.toggleClass('selected', false);

    elem.classList.add('selected');
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

const PlayerView = require('./player_deezer_popup');
const AlbumView = require('./album');
const template = require('./templates/movie_details');


module.exports = Mn.View.extend({
  template: template,

  ui: {
    img: 'img.poster',
  },
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

  initialize: function () {
    this.model.fetchSynopsis();
    this.model.fetchSoundtrack()
    .then(() => this.model.fetchDeezerIds());
  },

  serializeData: function () {
    return $.extend(this.model.toJSON(), { runningTasks: this.model.runningTasks });
  },

  onRender: function () {
    this.model.getPoster()
    .then((dataUri) => {
      this.ui.img.attr('src', dataUri);
    });

    if (this.model.has('soundtrack') && this.model.get('soundtrack').tracks) {
      const album = new Backbone.Model(this.model.get('soundtrack'));
      album.set('hasDeezerIds', this.model.hasDeezerIds());

      this.showChildView('soundtrack', new AlbumView({ model: album }));
    }

    if (this.model.hasDeezerIds()) {
      this.showChildView('player', new PlayerView());
    }
  },

  saveMovie: function () {
    // app.movies.add(this.model);
    this.model.save();
  },
});

});

require.register("views/movie_item.js", function(exports, require, module) {
'use-strict';

const template = require('./templates/movie_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  ui: {
    poster: '.poster',
    // img: '.poster img',
  },

  events: {
    //eslint-disable-next-line
    'click': 'showDetails',
  },

  modelEvents: {
    change: 'render',
  },

  initialize: function () {
    this.model.getPoster();
  },

  onRender: function () {
    this.model.getPoster()
    .then((dataUri) => {
      this.ui.poster.html(`<img src='${dataUri}' >`);
    });
  },

  showDetails: function () {
    app.trigger('details:show', this.model);
  },
});

});

require.register("views/movie_library.js", function(exports, require, module) {
'use strict';

const MovieItemView = require('./movie_item');
const EmptyView = require('./movie_library_empty');
const template = require('./templates/my_movies');

const MovieLibraryView = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: MovieItemView,
  emptyView: EmptyView,
});

module.exports = Mn.View.extend({
  className: 'mymovies',
  template: template,

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  onRender: function () {
    this.showChildView('collection', new MovieLibraryView({ collection: this.collection }));
  },
});

});

require.register("views/movie_library_empty.js", function(exports, require, module) {
'use-strict';

const template = require('./templates/movie_library_empty');


module.exports = Mn.View.extend({
  template: template,

  events: {
    'click button.konnector': 'fireIntent',
  },

  fireIntent: function () {
    cozy.client.intents.create('CREATE', 'io.cozy.accounts', { slug: 'orangelivebox' })
    .start(document.getElementById('popin'))
    .catch((err) => {
      const msg = "Erreur lors de l'activation du connecteur Orange Livebox";
      console.error(msg);
      console.error(err);
      app.trigger('message:error', msg);
    });
  },
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

  emptyView: Mn.View.extend({
    className: 'empty',
    template: emptyViewTemplate,
  }),
});


module.exports = Mn.View.extend({
  className: 'searchresults',
  tagName: 'section',
  template: template,

  ui: {
    title: 'h2',
  },

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  initialize: function () {
    this.listenTo(app, 'search', this.onSearch);
    this.collection = new SearchResultsCollection();
    this.listenTo(this.collection, 'done', this.onLoaded);
  },

  onSearch: function (query) {
    this.model.attributes = query;
    this.collection.reset();
    this.collection.fromKeyword(query.q); // async
    this.onLoading();
  },

  onLoading: function () {
    this.$el.toggleClass('loading', true);
    this.ui.title.text(
      `Recherche des films et séries dont le titre contient « ${this.model.get('q')} » sur Wikidata, en cours :`);
    app.trigger('mainTitle:set', `Recherche : « ${this.model.get('q')} »`);
  },

  onLoaded: function () {
    this.$el.toggleClass('loading', false);
    this.ui.title.text(`Films et séries dont le titre contient « ${this.model.get('q')} », trouvés sur Wikidata :`);
    app.trigger('mainTitle:set', `Films et séries pour : « ${this.model.get('q')} »`);
  },


  onRender: function () {
    const searchResultsView = new SearchResultsView({ collection: this.collection });
    this.showChildView('collection', searchResultsView);
    this.onSearch(this.model.attributes);
  },
});

});

require.register("views/player_deezer_iframe.js", function(exports, require, module) {
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

  onAttach: function () {
    this.setDeezerPlay('', 'tracks');
  },

  playTracks: function (tracksId) {
    this.setDeezerPlay(tracksId.join(','), 'tracks');
  },

  setDeezerPlay: function (id, type) {
    const params = {
      format: 'classic',
      autoplay: 'true',
      playlist: false,
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

require.register("views/player_deezer_popup.js", function(exports, require, module) {
'use-strict';

module.exports = Mn.View.extend({
  tagName: 'div',
  className: 'player',
  template: () => '',

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
      width: 700,
      height: 350,
      color: '007FEB',
      layout: 'dark',
      size: 'medium',
      app_id: 1,
      type: type,
      id: id,
    };
    open(`//www.deezer.com/plugins/player?${$.param(params)}`, 'Deezer Player', 'width=700,height=350');
  },
});

});

require.register("views/search.js", function(exports, require, module) {
'use-strict';

const template = require('views/templates/search');

module.exports = Mn.View.extend({
  tagName: 'div',
  template: template,

  ui: {
    search: 'input',
    submit: '.submit',
  },

  events: {
    'typeahead:select @ui.search': 'onSubmit',
    'keyup @ui.search': 'processKey',
    'click @ui.submit': 'onSubmit',
  },

  initialize: function () {
    this.listenTo(app, 'search:close', this.onEnd);
  },

  onRender: function () {
    this.ui.search.typeahead({
      hint: true,
      highlight: true,
      minLength: 3,
    }, {
      name: 'label',
      source: app.bloodhound,
      display: 'label',
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
;var locals_for_with = (locals || {});(function (artist, hasDeezerIds, title, tracks, undefined) {
jade_mixins["displayTrack"] = jade_interp = function(track, idx){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li class=\"track\"><span class=\"title\">" + (jade.escape(null == (jade_interp = track.title) ? "" : jade_interp)) + "</span>&emsp;par&nbsp;<span class=\"artist\">" + (jade.escape(null == (jade_interp = track.artist) ? "" : jade_interp)) + "</span>&nbsp;<span class=\"length\">" + (jade.escape(null == (jade_interp = moment.utc(track.length).format('mm:ss')) ? "" : jade_interp)) + "</span>&nbsp;");
if ( track.deezerId)
{
buf.push("<button" + (jade.attr("data-deezerid", track.deezerId, true, false)) + " class=\"play\"><i class=\"fa fa-play\"></i>&nbsp;<span class=\"listendeezer\">écouter via Deezer</span></button>");
}
buf.push("</li>");
};
buf.push("<div class=\"albuminfo\"><h3 class=\"title\">" + (jade.escape(null == (jade_interp = title) ? "" : jade_interp)) + "&ensp;<span class=\"artist\">par&nbsp;" + (jade.escape(null == (jade_interp = artist) ? "" : jade_interp)) + "</span>");
if ( hasDeezerIds)
{
buf.push("&emsp;<button class=\"play\"><i class=\"fa fa-play\"></i>&nbsp;<span class=\"listendeezer\">écouter via Deezer</span></button>");
}
buf.push("</h3></div><ol class=\"tracks\">");
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

buf.push("</ol>");}.call(this,"artist" in locals_for_with?locals_for_with.artist:typeof artist!=="undefined"?artist:undefined,"hasDeezerIds" in locals_for_with?locals_for_with.hasDeezerIds:typeof hasDeezerIds!=="undefined"?hasDeezerIds:undefined,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined,"tracks" in locals_for_with?locals_for_with.tracks:typeof tracks!=="undefined"?tracks:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
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

buf.push("<aside class=\"drawer\"></aside><div class=\"container\"><nav class=\"topbar\"><button class=\"toggle toggle-drawer\">&nbsp;</button><h1>La musique de mes films</h1></nav><main></main></div><article class=\"details\"></article><div class=\"message\"></div><div id=\"popin\"></div>");;return buf.join("");
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

;require.register("views/templates/how_it_works.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (features) {
jade_mixins["featureInfos"] = jade_interp = function(feature){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<h3>" + (jade.escape(null == (jade_interp = feature.label) ? "" : jade_interp)) + "&ensp;?</h3><div class=\"howitworks\">" + (null == (jade_interp = feature.howItWorks) ? "" : jade_interp) + "</div>");
};
buf.push("<h2>Dans l'application, comment ça marche pour ...</h2>");
jade_mixins["featureInfos"](features['q:Q100']);
jade_mixins["featureInfos"](features['q:Q101']);
jade_mixins["featureInfos"](features['q:Q102']);
jade_mixins["featureInfos"](features['q:Q103']);
jade_mixins["featureInfos"](features['q:Q104']);
jade_mixins["featureInfos"](features['q:Q105']);
buf.push("<hr/><a id=\"testalgos\" href=\"#\">Page de test des algorithmes</a>");}.call(this,"features" in locals_for_with?locals_for_with.features:typeof features!=="undefined"?features:undefined));;return buf.join("");
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
;var locals_for_with = (locals || {});(function (appName) {
buf.push("<div class=\"search\"><i class=\"fa fa-plus\"></i></div><div class=\"tools\">&nbsp;</div><ul class=\"selectlibrary\"><li type=\"radio\" name=\"optionslibrary\" data-value=\"videostreams\" class=\"selected\"><div class=\"illumination\">P</div>Programmes visionnés</li><li type=\"radio\" name=\"optionslibrary\" data-value=\"movies\"><div class=\"illumination\">F</div>Films</li><li type=\"radio\" name=\"optionslibrary\" data-value=\"tvseries\"><div class=\"illumination\">S</div>Séries</li></ul><div class=\"howitworks\"><div class=\"illumination\"><i class=\"fa fa-info-circle\"></i></div>Comment ça marche ?</div><div class=\"codesign\"><div class=\"code\">" + (jade.escape(null == (jade_interp = appName) ? "" : jade_interp)) + "</div></div><button class=\"toggle\"></button>");}.call(this,"appName" in locals_for_with?locals_for_with.appName:typeof appName!=="undefined"?appName:undefined));;return buf.join("");
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
;var locals_for_with = (locals || {});(function (countryOfOrigin, director, duration, genre, id, label, publicationDate, runningTasks, synopsis, viewed, wikiLinkFr) {
buf.push("<div class=\"moviedetails\"><img class=\"poster\"/><div class=\"movieabout\"><h2>" + (jade.escape(null == (jade_interp = label) ? "" : jade_interp)) + "</h2><div class=\"characteristics\"><b>");
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
buf.push("<button id=\"save\"><i class=\"fa fa-plus\"></i>&nbsp;Ajouter à la bibliothèque</button>");
}
else
{
buf.push("<button class=\"delete\"><i class=\"fa fa-times\"></i>&nbsp;Supprimer de la bibliothèque</button>");
}
buf.push("</div>");
if ( wikiLinkFr)
{
buf.push("<div class=\"synopsis\">" + (null == (jade_interp = synopsis) ? "" : jade_interp) + "</div><a" + (jade.attr("href", wikiLinkFr, true, false)) + " target=\"_blank\" class=\"wikipedia\">wikipedia<i class=\"fa fa-external-link\"></i></a>");
}
buf.push("</div></div><hr/><div class=\"soundtrack\"><h3>Musique associée");
if ( runningTasks.fetch_deezerIds || runningTasks.fetch_soundtrack)
{
buf.push("<div class=\"waitmessage\">");
if ( runningTasks.fetch_deezerIds)
{
buf.push("<span>Recherche des pistes sur Deezer</span>");
}
if ( runningTasks.fetch_soundtrack)
{
buf.push("<span>Recherche de la bande originale sur Musicbrainz</span>");
}
buf.push("<img src=\"img/ajax-loader-black.gif\"/></div>");
}
buf.push("</h3><div class=\"player\"></div><div class=\"album\">");
if ( !runningTasks.fetch_soundtrack)
{
buf.push("<div class=\"emptymessage\">La bande originale n'a pas été trouvée sur Musicbrainz.</div>");
}
buf.push("</div></div><div class=\"close\"></div>");}.call(this,"countryOfOrigin" in locals_for_with?locals_for_with.countryOfOrigin:typeof countryOfOrigin!=="undefined"?countryOfOrigin:undefined,"director" in locals_for_with?locals_for_with.director:typeof director!=="undefined"?director:undefined,"duration" in locals_for_with?locals_for_with.duration:typeof duration!=="undefined"?duration:undefined,"genre" in locals_for_with?locals_for_with.genre:typeof genre!=="undefined"?genre:undefined,"id" in locals_for_with?locals_for_with.id:typeof id!=="undefined"?id:undefined,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined,"publicationDate" in locals_for_with?locals_for_with.publicationDate:typeof publicationDate!=="undefined"?publicationDate:undefined,"runningTasks" in locals_for_with?locals_for_with.runningTasks:typeof runningTasks!=="undefined"?runningTasks:undefined,"synopsis" in locals_for_with?locals_for_with.synopsis:typeof synopsis!=="undefined"?synopsis:undefined,"viewed" in locals_for_with?locals_for_with.viewed:typeof viewed!=="undefined"?viewed:undefined,"wikiLinkFr" in locals_for_with?locals_for_with.wikiLinkFr:typeof wikiLinkFr!=="undefined"?wikiLinkFr:undefined));;return buf.join("");
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
;var locals_for_with = (locals || {});(function (label) {
buf.push("<div class=\"movieitem\"><div class=\"poster\"><div class=\"placeholder\"><h3>" + (jade.escape(null == (jade_interp = label) ? "" : jade_interp)) + "</h3><img src=\"img/cover_icon.png\"/></div></div></div>");}.call(this,"label" in locals_for_with?locals_for_with.label:typeof label!=="undefined"?label:undefined));;return buf.join("");
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

buf.push("<p>Il n'y a aucun film dans votre vidéothèque Cozy !</p><p>Pour en ajouter, vous pouvez<ul><li>Si vous êtes client Livebox Orange, récupérer votre historique de VOD et Replay en activant le&nbsp;<button class=\"konnector\">connecteur Orange Livebox.</button></li><li>Tout simplement, rechercher et ajouter un film ou une série avec la barre de recherche à gauche.</li></ul></p>");;return buf.join("");
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
buf.push("<h2>Résultats pour : «<span class=\"query\">" + (jade.escape(null == (jade_interp = q) ? "" : jade_interp)) + "</span>»</h2><ul></ul>");}.call(this,"q" in locals_for_with?locals_for_with.q:typeof q!=="undefined"?q:undefined));;return buf.join("");
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

buf.push("<p><b>Aucun film trouvé.</b></p><p>Attention, cette version n'est capable de rechercher que des films de cinéma, mais les séries devraient arriver dans une prochaine version !</p>");;return buf.join("");
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

;require.register("views/templates/my_movies.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (title) {
buf.push("<h2>" + (jade.escape(null == (jade_interp = title) ? "" : jade_interp)) + "</h2><ul></ul>");}.call(this,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined));;return buf.join("");
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

buf.push("<iframe id=\"deezerFrame\" scrolling=\"no\" frameborder=\"0\" allowTransparency=\"true\" width=\"600\" height=\"90\"></iframe>");;return buf.join("");
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

buf.push("<input type=\"search\" placeholder=\"Rechercher un film ...\" autocomplete=\"off\"/><div class=\"submit fa fa-search\"></div>");;return buf.join("");
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

;require.register("views/templates/videostream_item.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (action, content, timestamp) {
buf.push("<div" + (jade.attr("title", content.title + " - " + content.subTitle + "\n" + action, true, false)) + " class=\"videostreamitem\"><div class=\"audiovisualwork\"><div class=\"placeholder\"><h3>" + (jade.escape(null == (jade_interp = content.title) ? "" : jade_interp)) + "</h3><div class=\"subtitle\">" + (jade.escape(null == (jade_interp = content.subTitle) ? "" : jade_interp)) + "</div></div></div><div class=\"date\">" + (jade.escape(null == (jade_interp = moment(timestamp).format('LT L')) ? "" : jade_interp)) + "</div></div>");}.call(this,"action" in locals_for_with?locals_for_with.action:typeof action!=="undefined"?action:undefined,"content" in locals_for_with?locals_for_with.content:typeof content!=="undefined"?content:undefined,"timestamp" in locals_for_with?locals_for_with.timestamp:typeof timestamp!=="undefined"?timestamp:undefined));;return buf.join("");
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

;require.register("views/templates/videostreams.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (title) {
buf.push("<h2>" + (jade.escape(null == (jade_interp = title) ? "" : jade_interp)) + "</h2><ul></ul>");}.call(this,"title" in locals_for_with?locals_for_with.title:typeof title!=="undefined"?title:undefined));;return buf.join("");
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

;require.register("views/videostream_item.js", function(exports, require, module) {
'use-strict';

const MovieItem = require('./movie_item');
const template = require('./templates/videostream_item');

module.exports = Mn.View.extend({
  template: template,
  tagName: 'li',

  ui: {
    poster: '.poster',
    img: '.poster img',
  },

  regions: {
    audiovisualwork: '.audiovisualwork',
  },

  events: {
    //eslint-disable-next-line
    // 'click': 'showDetails',
  },

  modelEvents: {
    change: 'render',
  },

  onRender: function () {
    const audiovisualWork = this.model.getAudioVisualWork();
    if (audiovisualWork) {
      this.showChildView('audiovisualwork', new MovieItem({ model: audiovisualWork }));
    }
  },

  // showDetails: function () {
  //   app.trigger('details:show', this.model);
  // },
});

});

require.register("views/videostreams.js", function(exports, require, module) {
'use strict';

const ItemView = require('./videostream_item');
const EmptyView = require('./movie_library_empty');
const template = require('./templates/videostreams');

const CollectionView = Mn.CollectionView.extend({
  tagName: 'ul',
  className: 'movielibrary',
  childView: ItemView,
  emptyView: EmptyView,
});

module.exports = Mn.View.extend({
  className: 'mymovies',
  template: template,

  regions: {
    collection: {
      el: 'ul',
      replaceElement: true,
    },
  },

  initialize: function () {
    this.model = new Backbone.Model({ title: 'Mes programmes visionnés via ma Livebox Orange' });
  },

  onRender: function () {
    app.trigger('mainTitle:set', this.model.get('title'));
    this.showChildView('collection', new CollectionView({ collection: this.collection }));
  },
});

});

require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');

