'use-strict'

const funpromise = {}
funpromise.series = function (iterable, returnPromise, period) {
  const results = []

  return iterable.reduce((sequence, id, index, array) => {
    return sequence.then((res) => {
      results.push(res)
      return waitPromise(period).then(() => returnPromise(id, index, array))
    })
  }, Promise.resolve(true))
  .then(res => new Promise((resolve) => { // don't handle reject there.
    results.push(res)
    resolve(results.slice(1))
  }))
}

const waitPromise = function (period) {
  if (!period) {
    return Promise.resolve()
  }

  return new Promise((resolve) => { // this promise always resolve :)
    setTimeout(resolve, period)
  })
}

funpromise.find = function (iterable, predicate, period) {
  period = period || 100;

  const recursive = (list) => {
    const current = list.shift()
    if (current === undefined) { return Promise.resolve(undefined) }

    return predicate(current)
    .then((res) => {
      if (res === false) {
        return waitPromise(period).then(() => recursive(list))
      }

      return res
    })
  }

  return recursive(iterable.slice())
}

funpromise.backbone2Promise = function (obj, method, options) {
  return new Promise((resolve, reject) => {
    options = options || {}
    options = $.extend(options, { success: resolve, error: reject })
    method.call(obj, options)
  })
}

funpromise.queryPaginated = function (query, period) {
  period = period || 100;

  let docs = [];
  const recursive = (skip) => {
    return query(skip)
    .then((results) => {
      docs = docs.concat(results.docs);
      if (!results.next) {
        return docs
      }

      skip += results.limit
      return waitPromise(period).then(() => recursive(skip))
    })
  }

  return recursive(0)
}

typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = funpromise :
// typeof define === 'function' && define.aPLDd ? define(factory) :
this.funpromise = funpromise // put on window.
