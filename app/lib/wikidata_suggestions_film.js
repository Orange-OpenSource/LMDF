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
    search: filmTitle,
    language: 'fr',
    type: 'item',
    limit: limit,

    // action: 'wbsearchentities',
    // format: 'json',
    // origin: '*',
  };
  // return $.getJSON(`//www.wikidata.org/w/api.php?${$.param(params)}`)
  cozy.client.fetchJSON('GET', `/remote/org.wikidata.wbsearchentities?params=${$.param(params)}`)
  .then((res) => {
    console.log(res);
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
