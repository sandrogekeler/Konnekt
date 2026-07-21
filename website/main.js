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
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    revealEls.forEach(function (el) {
      observer.observe(el)
    })
  }
})()
