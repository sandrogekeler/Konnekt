/* Download page — detect platform, fetch the latest GitHub release, and wire
   the primary + per-platform download buttons from the release's assets. All
   version/size/date text comes from the fetched JSON; nothing is hard-coded. */
;(function () {
  var R = window.KonnektRelease
  if (!R) return

  var loadingEl = document.getElementById('dl-loading')
  var contentEl = document.getElementById('dl-content')
  var errorEl = document.getElementById('dl-error')
  var errorMsg = document.getElementById('dl-error-msg')
  var errorTitle = document.getElementById('dl-error-title')
  var versionPill = document.getElementById('dl-version')
  var primaryEl = document.getElementById('dl-primary')
  var gridEl = document.getElementById('dl-grid')
  var footnoteEl = document.getElementById('dl-footnote')

  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function show(node) {
    node.classList.remove('is-hidden')
  }
  function hide(node) {
    node.classList.add('is-hidden')
  }

  function firstAvailable(assets) {
    for (var i = 0; i < R.PLATFORMS.length; i++) {
      var a = R.matchAsset(R.PLATFORMS[i], assets)
      if (a) return { platform: R.PLATFORMS[i], asset: a }
    }
    return null
  }

  function renderPrimaryAvailable(platform, asset, version) {
    primaryEl.innerHTML = ''
    primaryEl.appendChild(el('div', 'dl-os-icon', platform.tag))
    primaryEl.appendChild(el('h2', null, 'Konnekt for ' + platform.name))
    primaryEl.appendChild(
      el(
        'p',
        'dl-meta',
        [version, R.formatBytes(asset.size), platform.desc].filter(Boolean).join(' · '),
      ),
    )
    var btn = el('a', 'btn btn-primary', 'Download ' + platform.tag + ' build')
    btn.href = asset.browser_download_url
    btn.setAttribute('download', '')
    primaryEl.appendChild(btn)
    var sub = el('p', 'dl-sub')
    sub.appendChild(document.createTextNode('Not on ' + platform.name + '? '))
    var link = el('a', null, 'See all downloads')
    link.href = '#dl-grid'
    sub.appendChild(link)
    primaryEl.appendChild(sub)
  }

  function renderPrimaryUnavailable(platform, fallback) {
    primaryEl.innerHTML = ''
    var name = platform ? platform.name : 'your platform'
    primaryEl.appendChild(el('div', 'dl-os-icon', platform ? platform.tag : '?'))
    if (platform && platform.id === 'mac') {
      primaryEl.appendChild(el('h2', null, 'macOS build coming soon'))
      primaryEl.appendChild(el('p', 'dl-meta', "We don't publish a macOS build yet."))
    } else {
      primaryEl.appendChild(el('h2', null, 'Choose your platform'))
      primaryEl.appendChild(
        el('p', 'dl-meta', "We couldn't match a build to " + name + ' automatically.'),
      )
    }
    if (fallback) {
      var btn = el('a', 'btn btn-primary', 'Download ' + fallback.platform.name + ' build')
      btn.href = fallback.asset.browser_download_url
      btn.setAttribute('download', '')
      primaryEl.appendChild(btn)
    } else {
      var gh = el('a', 'btn btn-secondary', 'Open releases on GitHub')
      gh.href = R.RELEASES_URL
      gh.target = '_blank'
      gh.rel = 'noopener'
      primaryEl.appendChild(gh)
    }
    var sub = el('p', 'dl-sub')
    var link = el('a', null, 'See all downloads')
    link.href = '#dl-grid'
    sub.appendChild(link)
    primaryEl.appendChild(sub)
  }

  function renderOthers(primaryPlatform, assets) {
    gridEl.innerHTML = ''
    R.PLATFORMS.forEach(function (p) {
      if (primaryPlatform && p.id === primaryPlatform.id) return
      var asset = R.matchAsset(p, assets)
      var card = el(asset ? 'a' : 'div', 'dl-card')
      if (asset) {
        card.href = asset.browser_download_url
        card.setAttribute('download', '')
      } else {
        card.className += ' is-unavailable'
      }
      card.appendChild(el('span', 'dl-card-icon', p.tag))
      var meta = el('div')
      meta.appendChild(el('div', 'dl-card-name', p.name))
      var line = asset ? p.desc + ' · ' + R.formatBytes(asset.size) : p.desc
      meta.appendChild(el('div', 'dl-card-meta', line))
      card.appendChild(meta)
      gridEl.appendChild(card)
    })
  }

  function render(rel) {
    var version = rel.tag_name || ''
    var date = R.formatDate(rel.published_at)
    var assets = rel.assets || []

    versionPill.innerHTML = ''
    versionPill.appendChild(el('span', 'dot'))
    versionPill.appendChild(
      document.createTextNode(' ' + [version, date].filter(Boolean).join(' · ')),
    )

    var detected = R.detectPlatform()
    var primary = detected === 'unknown' ? null : R.platformById(detected)
    var primaryAsset = R.matchAsset(primary, assets)

    if (primary && primaryAsset) {
      renderPrimaryAvailable(primary, primaryAsset, version)
      renderOthers(primary, assets)
    } else {
      renderPrimaryUnavailable(primary, firstAvailable(assets))
      renderOthers(null, assets)
    }

    footnoteEl.innerHTML = ''
    footnoteEl.appendChild(document.createTextNode('Looking for older versions or checksums? '))
    var relLink = el('a', null, 'Browse all releases on GitHub')
    relLink.href = R.RELEASES_URL
    relLink.target = '_blank'
    relLink.rel = 'noopener'
    footnoteEl.appendChild(relLink)
    footnoteEl.appendChild(document.createTextNode('.'))

    hide(loadingEl)
    show(contentEl)
  }

  function setPill(text) {
    versionPill.innerHTML = ''
    versionPill.appendChild(el('span', 'dot'))
    versionPill.appendChild(document.createTextNode(' ' + text))
  }

  function showEmpty() {
    hide(loadingEl)
    setPill('alpha · not yet released')
    errorEl.classList.remove('is-error')
    errorTitle.textContent = 'No public build yet'
    errorMsg.textContent =
      'Konnekt is still in alpha and no release has been published yet. Watch the repo to hear when the first build drops.'
    show(errorEl)
  }

  function showError(msg) {
    hide(loadingEl)
    setPill('version unavailable')
    errorTitle.textContent = "Couldn't reach GitHub"
    errorMsg.textContent = msg
    show(errorEl)
  }

  R.fetchLatest()
    .then(function (res) {
      if (res.status === 404) {
        showEmpty()
        return
      }
      if (!res.ok) {
        showError(
          res.status === 403
            ? "GitHub's rate limit was hit. Try again in a little while, or grab the build directly from GitHub."
            : 'GitHub returned an unexpected status (' + res.status + ').',
        )
        return
      }
      render(res.data)
    })
    .catch(function () {
      showError('Check your connection and try again.')
    })
})()
