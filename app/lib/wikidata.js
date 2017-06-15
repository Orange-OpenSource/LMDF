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
  sparql = encodeURIComponent(encodeURIComponent(sparql));
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


M.getPoster = function (movie) {
  if (typeof (movie.wikiLink) !== 'string') {
    console.error("Cant' get poster: no wiki link in movie obj.");
    movie.posterUri = false;
    return Promise.resolve(movie); // continue on errors.
  }

  const params = {
    action: 'parse',
    format: 'json',
    prop: 'images',
    page: decodeURIComponent(movie.wikiLink.replace(/.*\/wiki\//, '')),
  };
  return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.en.api?params=${encodeURIComponent($.param(params))}`)
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
    const params = {
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url',
      titles: `Image:${fileName}`,
    };
    return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.en.api?params=${encodeURIComponent($.param(params))}`);
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
    action: 'parse',
    format: 'json',
    prop: 'text',
    section: 1,
    disablelimitreport: 1,
    disableeditsection: 1,
    disabletoc: 1,
    page: decodeURIComponent(movie.wikiLinkFr.replace(/.*\/wiki\//, '')),
  };
  return cozy.client.fetchJSON('GET', `/remote/org.wikipedia.fr.api?params=${encodeURIComponent($.param(params))}`)
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
  .then(M.getPoster)
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
