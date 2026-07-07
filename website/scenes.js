;(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return

  var GLYPHS = ['╦', '╔', '╣', '╚', '╟', '╖', '╬']

  function randomGlyphs(min, max) {
    var len = min + Math.floor(Math.random() * (max - min + 1))
    var out = ''
    for (var i = 0; i < len; i++) {
      out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    }
    return out
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min)
  }

  // ── Live console — random-interval streaming lines ──────────────────────
  function consoleController(scene) {
    var timer = null
    var maxLines = 7
    var variants = ['', 'console-line--accent', 'console-line--muted', 'console-line--danger']

    function pushLine() {
      var line = document.createElement('div')
      var variant = Math.random() < 0.72 ? variants[0] : variants[1 + Math.floor(Math.random() * 3)]
      line.className = 'console-line' + (variant ? ' ' + variant : '')
      line.textContent = '> ' + randomGlyphs(6, 22)
      scene.appendChild(line)
      // Force a reflow so the transition-in actually plays.
      void line.offsetWidth
      line.classList.add('in')

      while (scene.children.length > maxLines) {
        scene.removeChild(scene.firstElementChild)
      }

      timer = setTimeout(pushLine, randomBetween(400, 1400))
    }

    return {
      start: function () {
        if (timer) return
        timer = setTimeout(pushLine, randomBetween(200, 600))
      },
      stop: function () {
        clearTimeout(timer)
        timer = null
      },
    }
  }

  // ── Config editor — random toggle flips + value swaps ───────────────────
  function configController(scene) {
    var timer = null

    function tick() {
      var toggles = scene.querySelectorAll('.config-toggle')
      var values = scene.querySelectorAll('.config-value')

      if (toggles.length && Math.random() < 0.7) {
        var t = toggles[Math.floor(Math.random() * toggles.length)]
        t.classList.toggle('on')
      }

      if (values.length && Math.random() < 0.6) {
        var v = values[Math.floor(Math.random() * values.length)]
        v.textContent = randomGlyphs(2, 4)
      }

      timer = setTimeout(tick, randomBetween(1500, 2500))
    }

    return {
      start: function () {
        if (timer) return
        timer = setTimeout(tick, randomBetween(600, 1200))
      },
      stop: function () {
        clearTimeout(timer)
        timer = null
      },
    }
  }

  // ── Tile dashboard — one tile "drags" to another slot (slow, animated),
  // the tile it displaces "snaps" to the vacated slot instantly ──────────
  function dashboardController(scene) {
    var timer = null

    function cycleOnce() {
      var tiles = scene.querySelectorAll('.dash-tile')
      var slotA = Math.floor(Math.random() * tiles.length)
      var slotB = Math.floor(Math.random() * tiles.length)
      if (slotB === slotA) slotB = (slotB + 1 + Math.floor(Math.random() * 3)) % tiles.length

      var tileA = null
      var tileB = null
      tiles.forEach(function (t) {
        var slot = Number(t.getAttribute('data-slot'))
        if (slot === slotA) tileA = t
        if (slot === slotB) tileB = t
      })

      if (tileA && tileB) {
        var placeholder = scene.querySelector('.dash-placeholder')
        var moveMs = 900 // matches .dash-tile's top/left transition duration

        // Highlight the target slot and lift the "dragged" tile while it
        // floats there — mirrors the app's own drag-and-drop feedback.
        if (placeholder) {
          placeholder.setAttribute('data-slot', String(slotB))
          placeholder.classList.add('visible')
        }
        tileA.classList.add('dash-tile--dragging')
        tileA.setAttribute('data-slot', String(slotB))

        // The tile it displaced snaps instantly into the vacated slot.
        tileB.classList.add('dash-tile--snap')
        tileB.setAttribute('data-slot', String(slotA))
        void tileB.offsetWidth
        tileB.classList.remove('dash-tile--snap')

        setTimeout(function () {
          tileA.classList.remove('dash-tile--dragging')
          if (placeholder) placeholder.classList.remove('visible')
        }, moveMs)
      }

      timer = setTimeout(cycleOnce, randomBetween(3000, 4000))
    }

    return {
      start: function () {
        if (timer) return
        timer = setTimeout(cycleOnce, 1200)
      },
      stop: function () {
        clearTimeout(timer)
        timer = null
      },
    }
  }

  var factories = {
    dashboard: dashboardController,
    console: consoleController,
    config: configController,
  }

  document.querySelectorAll('[data-scene]').forEach(function (scene) {
    var kind = scene.getAttribute('data-scene')
    var factory = factories[kind]
    if (!factory) return

    var controller = factory(scene)
    var card = scene.closest('.tile-card')
    if (!card) return

    card.addEventListener('mouseenter', controller.start)
    card.addEventListener('mouseleave', controller.stop)
    card.addEventListener('focusin', controller.start)
    card.addEventListener('focusout', controller.stop)
  })
})()
