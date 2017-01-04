'use-strict';

const CozyModel = require('../lib/backbone_cozymodel');

module.exports = CozyModel.extend({
  sync: function (method, model, options) {
    if (method === 'read' && model.isNew()) {
      return cozysdk.defineView(this.docType.toLowerCase(), 'all', 'function(doc) { emit(doc._id);}')
      .then(() => {
        return cozysdk.queryView(this.docType.toLowerCase(), 'all', { limit: 1, include_docs: true });
      })
      .then(res => ((res && res.length !== 0) ? res[0].doc : {}))
      .then(options.success, options.error);
    }

    return CozyModel.prototype.sync.call(this, method, model, options);
  },
});
