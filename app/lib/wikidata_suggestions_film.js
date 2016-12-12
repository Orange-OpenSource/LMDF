'use strict'

// query items with label
module.exports.findMovieMatches = function(filmTitle, nextSync, nextAsync) {
    nextSync();
    getFilmSuggestionObjectAPI(filmTitle).then(nextAsync);

    //     function(items) {
    //     let labels = items.map(item => item.label);
    //     console.log(labels);
    //     nextAsync(labels);
    // });
};


function getFilmSuggestionObjectAPI(filmTitle) {
  return $.getJSON(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(filmTitle)}&format=json&language=fr&type=item&origin=*`)
    .then(function(res) {
      console.log(res.search);

      // let items = res.search.sort((item,itemB) =>
      //   (item.description &&
      //   (item.description.indexOf('film') !== -1
      //   || item.description.indexOf('movie') !== -1)) ? -1 : 1
      //   );

      let items = res.search.filter(item => item.description &&
         (item.description.indexOf('film') !== -1
         || item.description.indexOf('movie') !== -1));
      console.log(items);
      return Promise.resolve(items);
    });
}