'use-strict';

const template = require('./templates/movie_library_empty');


module.exports = Mn.View.extend({
  template: template,

  events: {
    'click button.konnector': 'fireIntent',
  },

  fireIntent: function () {
    cozy.client.intents.create('CREATE', 'io.cozy.accounts', { slug: 'orangelivebox' })
    .start(document.getElementById('popin'))
    .catch((err) => {
      const msg = "Erreur lors de l'activation du connecteur Orange Livebox";
      console.error(msg);
      console.error(err);
      app.trigger('message:error', msg);
    });
  },
});
