;(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    document.documentElement.classList.add('reduce-motion')
  }

  // Nav background/border once the hero is scrolled past.
  var nav = document.getElementById('nav')
  var onScroll = function () {
    if (window.scrollY > 24) {
      nav.classList.add('scrolled')
    } else {
      nav.classList.remove('scrolled')
    }
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  // Reveal-on-scroll for anything marked .reveal.
  var revealEls = document.querySelectorAll('.reveal')
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) {
      el.classList.add('in-view')
    })
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    revealEls.forEach(function (el) {
      observer.observe(el)
    })
  }

  // Notify-me form — visual-only mock, no network call.
  var form = document.getElementById('notify-form')
  var input = document.getElementById('notify-email')
  var errorEl = document.getElementById('notify-error')
  var successEl = document.getElementById('notify-success')
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var value = input.value.trim()

      if (!emailPattern.test(value)) {
        input.classList.add('invalid')
        errorEl.textContent = 'Enter a valid email address.'
        input.focus()
        return
      }

      input.classList.remove('invalid')
      errorEl.textContent = ''
      form.classList.add('hidden')
      successEl.classList.add('visible')
    })

    input.addEventListener('input', function () {
      input.classList.remove('invalid')
      errorEl.textContent = ''
    })
  }
})()
