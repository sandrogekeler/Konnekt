/* Changelog page — lists GitHub releases with their notes, the same source the
   app's "What's new" reads. Release bodies are rendered by the sandboxed
   Markdown renderer in markdown.js. */
;(function () {
  var R = window.KonnektRelease
  var MD = window.KonnektMarkdown
  if (!R || !MD) return

  var loadingEl = document.getElementById('cl-loading')
  var listEl = document.getElementById('cl-list')
  var errorEl = document.getElementById('cl-error')
  var errorMsg = document.getElementById('cl-error-msg')
  var errorTitle = document.getElementById('cl-error-title')

  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text != null) n.textContent = text
    return n
  }

  function renderRelease(rel, isLatest) {
    var wrap = el('article', 'release')

    var head = el('div', 'release-head')
    var version = el('h2', 'release-version')
    version.appendChild(document.createTextNode(rel.name || rel.tag_name || 'Untitled'))
    if (isLatest) version.appendChild(el('span', 'release-latest', 'LATEST'))
    if (rel.prerelease) version.appendChild(el('span', 'release-latest', 'PRE-RELEASE'))
    head.appendChild(version)
    var date = R.formatDate(rel.published_at)
    if (date) head.appendChild(el('span', 'release-date', date))
    wrap.appendChild(head)

    var body = el('div', 'md')
    var notes = (rel.body || '').trim()
    if (notes) {
      body.innerHTML = MD.render(notes)
    } else {
      body.appendChild(el('p', null, 'No release notes for this version.'))
    }
    wrap.appendChild(body)
    return wrap
  }

  function render(releases) {
    var visible = releases.filter(function (r) {
      return !r.draft
    })
    if (!visible.length) {
      showEmpty()
      return
    }
    listEl.innerHTML = ''
    visible.forEach(function (rel, idx) {
      listEl.appendChild(renderRelease(rel, idx === 0))
    })
    loadingEl.classList.add('is-hidden')
    listEl.classList.remove('is-hidden')
  }

  function showEmpty() {
    loadingEl.classList.add('is-hidden')
    errorEl.classList.remove('is-error')
    errorTitle.textContent = 'No releases yet'
    errorMsg.textContent =
      'Konnekt is still in alpha — once the first version ships, its notes will show up here automatically.'
    errorEl.classList.remove('is-hidden')
  }

  function showError(msg) {
    loadingEl.classList.add('is-hidden')
    errorTitle.textContent = "Couldn't load the changelog"
    errorMsg.textContent = msg
    errorEl.classList.remove('is-hidden')
  }

  R.fetchList()
    .then(function (res) {
      if (res.status === 404) {
        showEmpty()
        return
      }
      if (!res.ok) {
        showError(
          res.status === 403
            ? "GitHub's rate limit was hit. Try again in a little while."
            : 'GitHub returned an unexpected status (' + res.status + ').',
        )
        return
      }
      render(Array.isArray(res.data) ? res.data : [])
    })
    .catch(function () {
      showError('Check your connection and try again.')
    })
})()
