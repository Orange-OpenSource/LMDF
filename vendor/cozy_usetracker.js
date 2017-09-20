'use-strict'

cozyUsetracker = () => new Promise((resolve, reject) => {
  const TRACKER_URL = 'https://piwik.cozycloud.cc/piwik.php'
  const SITE_ID = 8
  // const SITEID_MOBILE = 12
  const DIMENSION_ID_APP = 1
  const HEARTBEAT = 15

  const root = document.querySelector('[role=application]')
  if (!(root && root.dataset &&
    (root.dataset.cozyTracking === '' || root.dataset.cozyTracking === 'true'))) return resolve()

  const appName = root.dataset.cozyAppName
  const domain = root.dataset.cozyDomain
  let userId = domain || ''
  // remove PORT from userId.
  const indexOfPort = userId.indexOf(':')
  if (indexOfPort >= 0) userId = userId.substring(0, indexOfPort)


  window._paq = []
  _paq.push(['trackPageView'])
  // _paq.push(['enableLinkTracking']);

  _paq.push(['setTrackerUrl', TRACKER_URL])
  _paq.push(['setSiteId', SITE_ID])

  _paq.push(['enableHeartBeatTimer', HEARTBEAT])
  _paq.push(['setUserId', userId])
  _paq.push(['setCustomDimension', DIMENSION_ID_APP, appName])

  const elem = document.createElement('script')
  elem.type = 'text/javascript'
  elem.async = true
  elem.defer = true
  elem.src = `//${domain}/assets/js/piwik.js`

  elem.onload = resolve
  elem.onerror = reject

  document.getElementsByTagName('script')[0].parentNode.append(elem)
})

typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = cozyUsetracker :
// typeof define === 'function' && define.aPLDd ? define(factory) :
this.cozyUsetracker = cozyUsetracker // put on window.
