/* Feature tiles — cursor reactivity.
   Each .feat tile softly pulls toward the cursor and glows by proximity, and a
   spotlight wash tracks the pointer inside it. All effects are written to CSS
   custom properties (--pull-x/--pull-y/--glow/--mx/--my) that styles.css
   composes into the tile's transform and box-shadow, so this file only ever
   sets numbers — the presentation lives in CSS. Degrades to CSS-only
   hover-reveal under reduced motion, and to tap-to-reveal on coarse pointers. */
;(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var fine = window.matchMedia('(pointer: fine)').matches

  var section = document.getElementById('features')
  if (!section) return

  var tiles = Array.prototype.slice.call(section.querySelectorAll('.feat'))
  if (!tiles.length) return

  // Stagger idle-float phase so the tiles don't bob in unison.
  tiles.forEach(function (t, i) {
    t.style.setProperty('--float-delay', i * -900 + 'ms')
  })

  // No hover on coarse pointers — let a tap toggle the detail instead.
  if (!fine) {
    tiles.forEach(function (t) {
      t.addEventListener('click', function () {
        var wasActive = t.classList.contains('is-active')
        tiles.forEach(function (o) {
          o.classList.remove('is-active')
        })
        if (!wasActive) t.classList.add('is-active')
      })
    })
    return
  }

  // Fine pointer + reduced motion: keep the static CSS hover-reveal only.
  if (reduce) return

  var RADIUS = 260 // px influence radius
  var MAX_PULL = 8 // px max translate toward the cursor
  var pointer = { x: 0, y: 0, active: false }
  var raf = null

  function clearTile(t) {
    t.style.setProperty('--pull-x', '0px')
    t.style.setProperty('--pull-y', '0px')
    t.style.setProperty('--glow', '0')
  }

  function update() {
    raf = null
    tiles.forEach(function (t) {
      var r = t.getBoundingClientRect()
      var cx = r.left + r.width / 2
      var cy = r.top + r.height / 2
      var dx = pointer.x - cx
      var dy = pointer.y - cy
      var dist = Math.sqrt(dx * dx + dy * dy)

      if (!pointer.active || dist > RADIUS) {
        clearTile(t)
        return
      }

      var prox = 1 - dist / RADIUS // 0..1, closer = larger
      var ease = prox * prox // fall off faster near the edge
      var pull = MAX_PULL * ease
      var nx = dist ? dx / dist : 0
      var ny = dist ? dy / dist : 0

      t.style.setProperty('--pull-x', (nx * pull).toFixed(2) + 'px')
      t.style.setProperty('--pull-y', (ny * pull).toFixed(2) + 'px')
      t.style.setProperty('--glow', ease.toFixed(3))
      t.style.setProperty('--mx', (((pointer.x - r.left) / r.width) * 100).toFixed(1) + '%')
      t.style.setProperty('--my', (((pointer.y - r.top) / r.height) * 100).toFixed(1) + '%')
    })
  }

  function schedule() {
    if (raf === null) raf = requestAnimationFrame(update)
  }

  window.addEventListener(
    'pointermove',
    function (e) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
      schedule()
    },
    { passive: true },
  )

  function reset() {
    pointer.active = false
    schedule()
  }
  section.addEventListener('pointerleave', reset)
  window.addEventListener('blur', reset)
})()
