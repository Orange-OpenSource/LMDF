
module.exports.series = function(iterable, callback, self) {
  var results = [];

  return iterable.reduce(function(sequence, id, index, array) {
    return sequence.then(function(res) {
      results.push(res);
      return callback.call(self, id, index, array);
    });
  }, Promise.resolve(true)).then(function(res) {
    return new Promise(function(resolve, reject) {
      results.push(res);
      resolve(results.slice(1));
    });
  });
};

module.exports.backbone2Promise = function(obj, method, options) {
  return new Promise(function(resolve, reject) {
    options = options || {};
    options = $.extend(options, { success: resolve, error: reject });
    method.call(obj, options);
  });
};