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
