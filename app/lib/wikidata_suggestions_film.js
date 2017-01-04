'use strict';

// query items with label
module.exports.findMovieMatches = function (filmTitle, nextSync, nextAsync) {
  nextSync();
  getFilmSuggestionObjectAPI(filmTitle).then(nextAsync);
};

module.exports.fetchMoviesSuggestions = function (title) {
  return getFilmSuggestionObjectAPI(title);
};

function getFilmSuggestionObjectAPI(filmTitle) {
  const params = {
    action: 'wbsearchentities',
    search: filmTitle,
    language: 'fr',
    type: 'item',
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
