/* eslint-disable */
const WikidataSuggestions = require('lib/wikidata_suggestions');
const AudioVisualWork = require('models/audiovisualwork');

module.exports = {
  testAlgos: function () {
    app.trigger('message:display', 'Chargement du test, cela prendra quelques minutes.', 'testloading');
    const titles = [
      'American Graffiti',
      'Kill Bill 1',
      'Kill Bill 2',
      // NO musicbrainz
      'Le dernier des mohicans',
      'Alamo',
      // NO musicbrainz
      'The Mission',
      "Il était une fois dans l'ouest",
      'Le bon, la brute et le truand',
      'True Romance',
      'Orange mécanique',
      "2001, L'Odyssée de l'espace",
      "2010 : L'Année du premier contact",
      'Amadeus',
      'La panthère rose',

      "Dr House",
      "Mad Men",
      "Sons of Anarchy",
      "Soprano",
      // NO musicbrainz
      "Stranger things",
      "Six feet under",
      "Breaking bad",
      // NO musicbrainz
      "Peaky blinders",
      "Narcos",
      // NO musicbrainz
      "True detective",
      // NO musicbrainz
      "Deadwood",
      "Braquo",
    ];

    funpromise.series(titles, findAudioVisualWorks, 100)
    .then((awvs) => {
      let html = `<TABLE border=2 cellpadding=10>
        <THEAD>
          <TR>
            <TH>Titre</TH>
            <TH>Wikidata</TH>
            <TH>Synopsys</TH>
            <TH>Musicbrainz</TH>
            <TH>Deezer nb pistes</TH>
            <TH>Musicbrainz nb pistes</TH>
          </TR>
        </THEAD>
        <TBODY>`;

      html += awvs.map((awv, index) => {
        let row = null;
        try {
          row = `<TR data-index='${index}'>
            <TD>${awv.attributes.label}</TD>
            <TD>${!!awv.attributes.wikidataId}</TD>
            <TD>${!!awv.attributes.synopsis}</TD>
            <TD>${awv.attributes.soundtrack && awv.attributes.soundtrack.musicbrainzReleaseGroupId}</TD>
            <TD>${(awv.attributes.soundtrack && awv.attributes.soundtrack.tracks) ? awv.attributes.soundtrack.tracks.filter(track => track.deezerId).length : '-' }</TD>
            <TD>${(awv.attributes.soundtrack && awv.attributes.soundtrack.tracks) ? awv.attributes.soundtrack.tracks.length : '-' }</TD>
          </TR>`;
        } catch (e) {
          console.log(e);
          console.log(awv);
          console.log(index);
          row = `<TR data-index='${index}'><TD>${titles[index]}</TD></TR>`;
        }
        return row;
      }).join('');

      html += '</TBODY></TABLE>';

      app.layout.getRegion('main').$el.html(html);
      $('TR').click(() => app.trigger('details:show', awvs[Number(ev.currentTarget.dataset.index)]));

      app.trigger('message:hide', 'Chargement du test, cela prendra quelques minutes.', 'testloading');
    });
  },
};

findAudioVisualWorks = (name) => {
  let avw = { attributes: { label: name } };
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
  })
  .then((res) => { avw = res; })
  .then(() => avw.fetchSynopsis())
  .then(() => avw.fetchSoundtrack())
  .then(() => avw.fetchDeezerIds())
  .catch(() => true)
  .then(() => avw);
};
/* eslint-enable */
