module.exports = Mn.Behavior.extend({

  events: {
    'click .toggle': 'toggleExpand',
  },


  toggleExpand: function() {
    this.$el.toggleClass('compact');
    this.$el.toggleClass('expanded');

    // if (this.ui.toHide) {
    //   if (this.expanded) {
    //     this.ui.toHide.hide();
    //   } else {
    //     this.ui.toHide.show();
    //   }
    // }

    // this.expanded = !this.expanded;
  },

  onRender: function() {
    this.$el.addClass('compact');
    // this.expanded = false;
  }
});
