var WalkTreeUtils = require('./walktree_utils');

var get = WalkTreeUtils.get;
var getFirst = WalkTreeUtils.getFirst;

var originalTitle = 'P1476';
var composer = 'P86';
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
    title: get(movie, 'claims', originalTitle, 0, 'mainsnak', 'datavalue', 'value', 'text'),
    imdbId: getId(movie, imdbID),
  };

  var musicbrainzReleaseGroupId = get(movie, musicBrainzRGID);
  if (musicbrainzReleaseGroupId) {
    obj.musicbrainzReleaseGroupId = [{ musicbrainzReleaseGroupId: musicbrainzReleaseGroupId}];
  }

  return obj;
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
  return M.getEntityById(wikidataId)
    .then(M.parseMovie)
    .then(M.getPoster)
    .then(function(movie) {
      if (!movie.composer) {
        return movie;
      }

      return M.getEntityById(movie.composer)
      .then(M.parseComposer)
      .then(function(composer) {
        movie.composer = composer;
        return movie;
      });
    });
};


// Helper
function getId(obj, prop) {
  return get(obj, 'claims', prop, 0, 'mainsnak', 'datavalue', 'value');
}

console.log(M);

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
