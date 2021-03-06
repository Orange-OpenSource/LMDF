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

const CozyModel = require('../lib/backbone_cozymodel');
const AudioVisualWork = require('../models/audiovisualwork');
const WikidataSuggestions = require('../lib/wikidata_suggestions');

module.exports = CozyModel.extend({
  docType: 'fr.orange.videostream',

  getAudioVisualWork: function () {
    if (!this.audioVisualWork) {
      const findVideoStream = (movie) => {
        return movie.has('viewed') && _.findWhere(movie.get('viewed'), { videoStreamId: this.get('_id') });
      };
      this.audioVisualWork = app.movies.find(findVideoStream)
        || app.tvseries.find(findVideoStream)
        || null;
              // this.audiovisualWork = app.movies.at(Math.ceil(Math.random() * 50));
    }
    return this.audioVisualWork;
  },

  getName: function () {
    const content = this.get('content');
    if (!content) { return name; }

    // Movies
    if (this.get('action') === 'Visualisation'
     && this.get('details') && this.get('details').offerName !== 'AVSP TV LIVE'
     && this.get('details').offerName !== 'OTV' && !content.subTitle) {
      return content.title.replace(' - HD', '')
        .replace(/^BA - /, '')
        .replace(/ - extrait exclusif offert$/, '')
        .replace(/ - extrait offert$/, '')
        .replace(/ - édition spéciale$/, '')
        ;
    }

    // TODO : is it a good idea ! ?
    // include commande of movies :
    if (!content.subTitle) {
      return content.title.replace(' - HD', '')
        .replace(/^BA - /, '')
        .replace(/ - extrait exclusif offert$/, '')
        .replace(/ - extrait offert$/, '')
        .replace(/ - édition spéciale$/, '')
        ;
    }
    // if (!content.subTitle) { return ''; }

    // series
    // look in subtitle, remove %d - in front, and  - S%d%d at the end.

    return content.subTitle.replace(/^\d+[ ]*-[ ]*/, '')
      .replace(/[ ]*-?[ ]+S\d+$/, '')
      .replace(/[ ]*-[ ]*VOST$/, '')
      .replace(/&/g, ' ')
      ;
  },

  findAudioVisualWork: function () {
    const name = this.getName();
    if (!name) { return Promise.reject('neither a film nor tvserie'); } // TODO

    const avw = app.movies.findWhere({ orangeName: name }) || app.tvseries.findWhere({ orangeName: name });
    if (avw) { return Promise.resolve(avw); }

    return new Promise(resolve => app.bloodhound.search(name, resolve))
    .then((suggestions) => {
      if (suggestions.length === 0) {
        return WikidataSuggestions.fetchMoviesSuggestions(name);
      }
      return suggestions;
    })
    .then((suggestions) => {
      if (suggestions.length === 0) {
        return Promise.reject(`${name} not found on wikidata`);
      }
      return AudioVisualWork.fromWDSuggestion(suggestions[0]);
    }).then((avw) => {
      // The AudioViualWork may already exist in the library.
      avw = app.movies.findWhere({ wikidataId: avw.get('wikidataId') })
        || app.tvseries.findWhere({ wikidataId: avw.get('wikidataId') })
        || avw;

      avw.set('orangeName', name);
      return avw;
    });
  },
});
