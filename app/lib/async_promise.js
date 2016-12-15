
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