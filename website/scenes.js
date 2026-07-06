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

  // ── Mods & plugins — a random stacked tile cycles out/in ────────────────
  function modsController(scene) {
    var timer = null
    var exitMs = 280 // matches --duration-panel

    function cycleOne() {
      var tiles = scene.querySelectorAll('.mods-tile')
      var tile = tiles[Math.floor(Math.random() * tiles.length)]

      tile.classList.add('mods-tile--exit')

      setTimeout(function () {
        tile.textContent = randomGlyphs(3, 5)
        tile.classList.remove('mods-tile--exit')
        tile.classList.add('mods-tile--enter-from')
        // Force reflow so the "from" position applies before we transition back.
        void tile.offsetWidth
        tile.classList.remove('mods-tile--enter-from')
      }, exitMs)

      timer = setTimeout(cycleOne, randomBetween(2000, 3200))
    }

    return {
      start: function () {
        if (timer) return
        timer = setTimeout(cycleOne, randomBetween(800, 1600))
      },
      stop: function () {
        clearTimeout(timer)
        timer = null
      },
    }
  }

  var factories = {
    console: consoleController,
    config: configController,
    mods: modsController,
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
