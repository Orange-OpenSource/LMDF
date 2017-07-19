// node script, prefetch wikidata movies to populate suggestions lists in /data .

const fs = require('fs');
const wdk = require('wikidata-sdk');
const request = require('request');
const mkdirp = require('mkdirp');

// Require wikidata.js .
// fetch data:

const fileName = 'data/wikidata_movie_tvserie_labels.json';
// const fileName = 'data/wikidata_movie_labels.json';

const sparql = `SELECT DISTINCT ?id ?label WHERE {
  {
    ?id wdt:P31/wdt:P279* wd:Q11424;
      wdt:P345 ?imdbId;
		  wdt:P577 ?date
    FILTER (?date > "1970-01-23T12:00:00Z"^^xsd:dateTime)
  } UNION {
    ?id wdt:P31/wdt:P279* wd:Q5398426
  }

  ?id	rdfs:label ?label.

	filter langMatches(lang(?label),'fr')

}
`;
// {
//   ?id wdt:P31/wdt:P279* wd:Q11424
// } UNION {
//   ?id wdt:P31/wdt:P279* wd:Q5398426
// }

// Q5398426

http://www.wikidata.org/entity/
function fetch (callback) {
  return request(wdk.sparqlQuery(sparql), (err, response, body) => {
    let list = wdk.simplifySparqlResults(body);
    list.sort((a, b) => { return (a.label < b.label) ? -1 : 1; });
    callback(err, list);
  });
}

function write (json) {
  fs.writeFileSync(fileName, JSON.stringify(json));
}

fetch(function(err, list) {
  if (err) { return err; }
  write(list);
  // console.log(list);
});
