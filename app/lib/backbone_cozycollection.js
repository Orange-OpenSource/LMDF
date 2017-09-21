module.exports = Backbone.Collection.extend({

  getFetchIndex: () => ['_id'],

  getFetchQuery: () => ({ selector: { _id: { $gt: null } } }),

  sync: function (method, collection, options) {
    if (method !== 'read') {
      console.error('Only read is available on this collection.');
      if (options.error) {
        options.error('Only read is available on this collection.');
      }
      return;
    }

    //eslint-disable-next-line
    const docType = new this.model().docType.toLowerCase();

    return cozy.client.data.defineIndex(docType, this.getFetchIndex())
    .then(index => funpromise.queryPaginated((skip) => {
      const params = this.getFetchQuery();
      params.skip = skip;
      params.wholeResponse = true;
      return cozy.client.data.query(index, params);
    }))
    .then(options.success, options.error);
  },
});
