/*
 * Copyright (C) 2018 - 2019 Orange
 * 
 * This software is distributed under the terms and conditions of the 'MIT'
 * license which can be found in the file 'LICENSE.txt' in this package distribution 
 * or at https://spdx.org/licenses/MIT
 *
 */

 /* Orange contributed module for use on CozyCloud platform
 * 
 * Module name: LMDMF - La musique de mes films
 * Version:     3.0.13
 * Created:     2018 by Orange
 */


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
