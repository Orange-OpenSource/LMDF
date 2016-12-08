module.exports = Mn.Behavior.extend({

  events: {
    'click .delete': 'destroyObject',
  },

  destroyObject: function() {
    if (this.options.onDestroy) {
      this.view[this.options.onDestroy]();
    } else {
      this.view.model.destroy();
    }
  },
});
