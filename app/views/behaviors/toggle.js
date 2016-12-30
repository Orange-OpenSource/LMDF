module.exports = Mn.Behavior.extend({

  triggers: {
    'click .toggle': 'toggle',
    'click @ui.toggle': 'toggle',
    'click .contract': 'contract',
    'click @ui.contract': 'contract',
    'click .expand': 'expand',
    'click @ui.expand': 'expand',
  },

  onExpand: function() {
    this.setExpanded(true);
  },

  onContract: function() {
    console.log('toto');
    this.setExpanded(false);
  },

  onToggle: function() {
    console.log('yeee');
    var isVisible = this.$el.attr('aria-expanded') === 'true';
    this.setExpanded(!isVisible);
  },

  setExpanded: function(isExpanded) {
    this.$el.attr('aria-expanded', isExpanded);
  },

  onRender: function() {
    this.onContract();
  },
});
