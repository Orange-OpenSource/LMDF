'use-strict';

const template = require('./templates/album');

module.exports = Mn.View.extend({
  template: template,
  className: 'album',
});
