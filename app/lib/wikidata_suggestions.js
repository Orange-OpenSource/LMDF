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
  // return getFilmSuggestionObjectAPI(title);
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
  params = encodeURIComponent(params);
  return cozy.client.fetchJSON('GET', `/remote/org.wikidata.wbsearchentities?params=${params}`)
  .then(res => ((typeof (res) === 'string') ? JSON.parse(res) : res))
  .then((res) => {
    const items = res.search.filter(item => {
      if (item.description) {
        const description = item.description.toLowerCase();
        return (description.indexOf('film') !== -1
        || description.indexOf('movie') !== -1
        || description.indexOf('tv series') !== -1
        || description.indexOf('television series') !== -1);
      }
      return false;
    });

    // Option: sort instead of filter.
    // let items = res.search.sort((item,itemB) =>
    //   (item.description &&
    //   (item.description.indexOf('film') !== -1
    //   || item.description.indexOf('movie') !== -1)) ? -1 : 1
    //   );

    return Promise.resolve(items);
  });
}
