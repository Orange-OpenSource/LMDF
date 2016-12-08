(function() {
  'use strict';

  var globals = typeof window === 'undefined' ? global : window;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = ({}).hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = null;
    hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = window;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("application.js", function(exports, require, module) {
// Main application that create a Mn.Application singleton and
// exposes it.


var Router = require('router');
var AppLayout = require('views/app_layout');


// var Properties = require('models/properties');
require('views/behaviors');

var Application = Mn.Application.extend({

  initialize: function() {
    // this.properties = Properties;
  },

  prepare: function() {
    return Promise.resolve();
  },

  prepareInBackground: function() {
    return this._defineViews();
  },


  _defineViews: function() {
  },

  onBeforeStart: function() {
    this.layout = new AppLayout();
    this.router = new Router();

    if (typeof Object.freeze === 'function') {
      Object.freeze(this);
    }
  },

  onStart: function() {
    this.layout.render();
    // prohibit pushState because URIs mapped from cozy-home rely on fragment
    if (Backbone.history) {
      Backbone.history.start({ pushState: false });
    }
    // TODO : keep this, display always a random details.
    //var randomIndex = Math.floor(Math.random() * this.subsets.size());
    //this.trigger('requestform:setView', this.subsets.at(randomIndex));

    console.log('hello');
    this.listenTo(this, 'message:error', function() { console.log(arguments);} );

    setTimeout(function() {
      application.trigger('message:error', "Hello Toto");
    console.log('helloeuhh');

    }, 10000)

  },

});

var application = new Application();

module.exports = application;

document.addEventListener('DOMContentLoaded', function() {
  application.prepare()
    .then(function() { return application.prepareInBackground();})
    .then(application.start.bind(application));
});


});

require.register("lib/appname_version.js", function(exports, require, module) {
var name = 'lamusiquedemesfilms';
var version = '0.0.1-dev';

module.exports = name + '-' + version;

});

require.register("models/properties.js", function(exports, require, module) {
var appName = require('lib/appname_version');

var Properties = Backbone.Model.extend({

  docType: 'MesInfosDataPlaygroundProperties'.toLowerCase(),
  defaults: {
    docTypeVersion: appName(),
    synthSets: {},
  },


  parse: function(raw) {
    raw.id = raw._id;
    return raw;
  },

  sync: function(method, model, options) {
    var callback = function(err, res) {
      if (err) { return options.error(err); }
      options.success(res);
    }

    if (method === 'create') {
      return cozysdk.create(this.docType, model.attributes, callback);
    } else if (method === 'update' || method === 'patch') {
      return cozysdk.updateAttributes(this.docType, model.attributes._id, model.attributes, callback);
    } else if (method === 'delete') {
      return cozysdk.destroy(this.docType, model.attributes._id, callback);
    } else if (method === 'read') {
      if (model.isNew()) {
        return cozysdk.defineView(Properties.prototype.docType, 'all',
        'function(doc) { emit(doc._id);}'
          ).then(function() {
              return cozysdk.queryView(Properties.prototype.docType, 'all', {limit: 1, include_docs: true}); }
          ).then(function(res) {
            // TODO error handling !
            return (res && res.length !== 0) ? res[0].doc : {};
          }).then(options.success, options.error);
      } else {
        return cozysdk.find(this.docType, model.attributes._id)
          .then(options.success, options.error);
      }
    }
  },

  _promiseSave: function(attributes) {
    return new Promise(function(resolve, reject) {
      this.save(attributes, { success: resolve, error: reject });
    }.bind(this));
  },

  addSynthSetIds: function(setName, ids) {
    var set = this.get('synthSets')[setName];
    set = set ? set.concat(ids) : ids;

    var sets = this.get('synthSets');
    sets[setName] = set;
    return this._promiseSave({ synthSets: sets });
    // return new Promise(function(resolve, reject) {
    //   this.save({ synthSets: sets }, { success: resolve, error: reject });
    // }.bind(this));
  },

  cleanSynthSetIds: function(setName) {
    var sets = this.get('synthSets');
    delete sets[setName];
    return this._promiseSave({ synthSets: sets});
  },

});

module.exports = new Properties();

});

require.register("router.js", function(exports, require, module) {
var app = undefined

module.exports = Backbone.Router.extend({
    routes: {
        '': 'index',
    },

    initialize: function() {
      app = require('application');
    },


    });

});

require.register("views/app_layout.js", function(exports, require, module) {
var MessageView = require('views/message');

var app = undefined;

module.exports = Mn.View.extend({

  template: require('views/templates/app_layout'),
  el: '[role="application"]',

  behaviors: {},

  regions: {
    library: '.library',
    search: '.searchfilms',
    player: '.player',
    details: '.details',
    message: '.message',
  },

  initialize: function() {
    app = require('application');
  },

  onRender: function() {
    this.showChildView('message', new MessageView());
  },
});

});

require.register("views/behaviors/destroy.js", function(exports, require, module) {
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

});

require.register("views/behaviors/index.js", function(exports, require, module) {
Mn.Behaviors.behaviorsLookup = function() { return window.Behaviors; };

window.Behaviors = {
  // Toggle: require('views/behaviors/toggle'),
  // Destroy: require('views/behaviors/destroy'),
};

});

require.register("views/behaviors/toggle.js", function(exports, require, module) {
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

});

require.register("views/message.js", function(exports, require, module) {
var app = null;

module.exports = Mn.View.extend({
    tagName: 'div',
    template: require('views/templates/message'),

    ui: {
      message: '.display',
    },
    events: {
      'click .close': 'onClose',
    },

    initialize: function() {
      app = require('application');
      this.messages = {};
      this.listenTo(app, 'message:display', this.onDisplay);
      this.listenTo(app, 'message:hide', this.onHide);
      this.listenTo(app, 'message:error', this.onDisplay);
    },

    serializeData: function() {
      return { messages: this.messages  };
    },

    onError: function(message) {
      this.onDisplay(Math.ceil(Math.random() * 10000), message);
    },

    onDisplay: function(id, message) {
      console.log(message);
      this.messages[id] = message;
      this.render();
    },

    onClose: function(ev) {
      this.onHide(ev.currentTarget.dataset.messageid);
    },

    onHide: function(id) {
      delete this.messages[id];

      this.render();

    },

});

});

require.register("views/templates/app_layout.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

buf.push("<div class=\"message\"></div><input type=\"search\" placeholder=\"La grande évasion\" class=\"searchfilm form-control\"/><div class=\"library\"></div><div class=\"details\"></div><div class=\"player\"></div>");;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("views/templates/message.jade", function(exports, require, module) {
var __templateData = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;
;var locals_for_with = (locals || {});(function (messages, undefined) {
jade_mixins["displayMessage"] = jade_interp = function(id, m){
var block = (this && this.block), attributes = (this && this.attributes) || {};
buf.push("<li><span class=\"display\">" + (jade.escape(null == (jade_interp = m) ? "" : jade_interp)) + "</span><span" + (jade.attr("data-messageid", id, true, false)) + " class=\"close\">X</span></li>");
};
if ( (messages.length != 0))
{
buf.push("<ul>");
// iterate messages
;(function(){
  var $$obj = messages;
  if ('number' == typeof $$obj.length) {

    for (var id = 0, $$l = $$obj.length; id < $$l; id++) {
      var message = $$obj[id];

jade_mixins["displayMessage"](id, message);
    }

  } else {
    var $$l = 0;
    for (var id in $$obj) {
      $$l++;      var message = $$obj[id];

jade_mixins["displayMessage"](id, message);
    }

  }
}).call(this);

buf.push("</ul>");
}}.call(this,"messages" in locals_for_with?locals_for_with.messages:typeof messages!=="undefined"?messages:undefined,"undefined" in locals_for_with?locals_for_with.undefined:typeof undefined!=="undefined"?undefined:undefined));;return buf.join("");
};
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return __templateData;
  });
} else if (typeof module === 'object' && module && module.exports) {
  module.exports = __templateData;
} else {
  __templateData;
}
});

;require.register("___globals___", function(exports, require, module) {
  
});})();require('___globals___');


//# sourceMappingURL=app.js.map