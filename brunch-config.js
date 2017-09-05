module.exports = {
  // See http://brunch.io for documentation.
  files: {
    javascripts: {
      joinTo: {
        'vendor.js': /^vendor/,
        'app.js': /^app/
      },
      order: {
        before: [
          'vendor/marionette/underscore.js',
          'vendor/jquery.min.js',
          // 'vendor/jquery.min.js',
          //'vendor/underscore-min.js',
          //'vendor/backbone-min.js',
          //'vendor/backbone.radio.min.js',
          //'vendor/backbone.marionette.min.js',
          'vendor/marionette/backbone.js',
          'vendor/marionette/backbone.radio.js',
          'vendor/marionette/backbone.marionette.js',
          'vendor/moment.min.js',
          'vendor/moment_locale-fr.js',
          ]
      }
    },
    stylesheets: {joinTo: 'app.css'},
    templates: {
      joinTo: 'app.js'
    },
  },
  plugins: {
    jade: {
      globals: ['moment', '_']
    },
    version: {
      fileVersionField: 'manifest.webapp'
    }
  }
}
