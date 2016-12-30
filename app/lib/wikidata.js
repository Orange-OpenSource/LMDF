var WalkTreeUtils = require('./walktree_utils');

var get = WalkTreeUtils.get;
var getFirst = WalkTreeUtils.getFirst;

var originalTitle = 'P1476';
var composer = 'P86';
var genre = 'P136';
var publicationDate = 'P577';
var duration = 'P2047';
var director = 'P57';
var musicBrainzRGID = 'P436';
var imdbID = 'P345';



var M = {};

M.getEntityById = function(wikidataId) {
  return $.getJSON("https://www.wikidata.org/wiki/Special:EntityData/" + wikidataId + ".json")
  .then(function(res) {
    var entity = res.entities[wikidataId];
    if (entity) {
      return Promise.resolve(entity);
    } else {
      return Promise.reject();
    }
  });
};

/* @param movie result from wikidata request */
M.parseMovie = function(movie) {
  var props = movie.claims;

  var obj = {
    wikidataId: movie.id,
    composer: get(movie, 'claims', composer, 0, 'mainsnak', 'datavalue', 'value', 'id'),
    originalTitle: get(movie, 'claims', originalTitle, 0, 'mainsnak', 'datavalue', 'value', 'text'),
    imdbId: getId(movie, imdbID),
  };

  obj.labels = { default: obj.originalTitle };

  try {
    var labels = get(movie, 'labels');

    for (var k in labels) {
      obj.labels[k] = get(labels, k, 'value');
    }
  } catch(e) { console.warn(e); }

  var musicbrainzReleaseGroupId = get(movie, musicBrainzRGID);
  if (musicbrainzReleaseGroupId) {
    obj.musicbrainzReleaseGroupId = [{ musicbrainzReleaseGroupId: musicbrainzReleaseGroupId}];
  }

  return obj;
};

M.getMovieData = function(wikidataId) {
  let sparql = `SELECT ?label ?wikiLink ?originalTitle ?composer ?composerLabel ?genre ?genreLabel ?publicationDate ?duration ?director ?directorLabel ?musicBrainzRGId ?imdbId ?countryOfOrigin ?countryOfOriginLabel WHERE {
     wd:${wikidataId} wdt:P31 wd:Q11424;
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
  .then(movies => {
    movies[0].wikidataId = wikidataId;
    console.log(movies[0]);
    return movies[0];});
};

M.parseComposer = function(composer) {
  return {
    label: get(composer, 'labels', 'en', 'value'),
    wikidataId: composer.id,
  };
};

M.getPoster = function(movie) {
  return $.getJSON('http://www.omdbapi.com/?plot=short&r=json&i=' + movie.imdbId)
  .then(function(res) {
    movie.posterUri = res.Poster;
    return movie;
  }).catch(function(err) {
    console.error(err);
    return movie;
  });
};


M.getMovieById = function(wikidataId) {
  return M.getMovieData(wikidataId)
  // M.getEntityById(wikidataId)
    // .then(M.parseMovie)
    .then(M.getPoster)
    .then(M.getSynopsis);
    // .then(function(movie) {
      // if (!movie.composer) {
        // return movie;
      // }

      // return M.getEntityById(movie.composer)
      // .then(M.parseComposer)
      // .then(function(composer) {
        // movie.composer = composer;
        // return movie;
      // });
    // });
};

M.getSynopsis = function(movie) {
  if (!movie.wikiLink) {
    console.warn('no wiki link');
    return movie;
  }
  let uri = movie.wikiLink.replace('/wiki/' , '/w/api.php?origin=*&action=parse&format=json&prop=text&section=1&disablelimitreport=1&disableeditsection=1&disabletoc=1&page=');
  return $.getJSON(uri).then(data => {
    let html = data.parse.text['*'];
    movie.synopsis = $(html).text().slice(7);
    // movie.synopsis = html;

    return movie;
  });

};

// Helper
function getId(obj, prop) {
  return get(obj, 'claims', prop, 0, 'mainsnak', 'datavalue', 'value');
}

module.exports = M;
// // Pure sparql
// function queryFilmObject(frenchName) {
//   var baseURI = 'https://query.wikidata.org/bigdata/namespace/wdq/sparql?query=';
//       let sparql = `select distinct ?film where  {
//           ?film wdt:P31 wd:Q11424;
//           rdfs:label "${frenchName}"@en.
//       }` ;
//       return $.getJSON(baseURI + encodeURIComponent(sparql));
//   }
