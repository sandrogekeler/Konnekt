/* Interactive scheduler demo — a hand-rolled imitation of the app's
   @xyflow/react block editor (frontend/src/tiles/scheduler/). Nodes are
   absolutely-positioned divs over an SVG edge layer; you can drag nodes and
   drag from an output port to an input port to wire a new connection. Colors,
   icons and port shapes mirror the app's blockMeta.ts so the demo reads as the
   same product. No libraries. */
;(function () {
  var root = document.getElementById('sched-demo')
  if (!root) return

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── App-faithful palette (frontend/src/tiles/scheduler/editor/blockMeta.ts)
  var CAT_COLOR = {
    trigger: '#7c3aed',
    action: '#0369a1',
    control: '#b45309',
    notify: '#047857',
    data: '#0e7490',
  }
  var CAT_ICON = {
    trigger: '!',
    action: '>',
    control: '?',
    notify: '#',
    data: '*',
  }
  var CTRL_PORT_COLOR = {
    trigger: '#7c3aed',
    run: '#94a3b8',
    onComplete: '#22c55e',
    onFailed: '#ef4444',
    onTrue: '#22c55e',
    onFalse: '#f97316',
  }
  var DATA_PORT_COLOR = {
    string: '#60a5fa',
    number: '#a3e635',
    bool: '#fb923c',
  }

  function ctrlColor(id) {
    return CTRL_PORT_COLOR[id] || '#94a3b8'
  }
  function dataColor(type) {
    return DATA_PORT_COLOR[type] || '#60a5fa'
  }

  // ── Example graph. x/y are fractions of the canvas so the initial layout
  // scales with the container; dragging then works in pixels.
  var NODES = [
    {
      id: 'schedule',
      title: 'Schedule',
      cat: 'trigger',
      x: 0.02,
      y: 0.08,
      outs: [{ id: 'trigger', label: 'trigger', kind: 'ctrl' }],
    },
    {
      id: 'players',
      title: 'Player count',
      cat: 'data',
      x: 0.02,
      y: 0.62,
      outs: [{ id: 'value', label: 'players', kind: 'data', type: 'number' }],
    },
    {
      id: 'cond',
      title: 'If players = 0',
      cat: 'control',
      x: 0.36,
      y: 0.32,
      ins: [
        { id: 'run', label: 'run', kind: 'ctrl' },
        { id: 'a', label: 'value', kind: 'data', type: 'number' },
      ],
      outs: [
        { id: 'onTrue', label: 'onTrue', kind: 'ctrl' },
        { id: 'onFalse', label: 'onFalse', kind: 'ctrl' },
      ],
    },
    {
      id: 'restart',
      title: 'Restart server',
      cat: 'action',
      x: 0.68,
      y: 0.06,
      ins: [{ id: 'run', label: 'run', kind: 'ctrl' }],
      outs: [
        { id: 'onComplete', label: 'onComplete', kind: 'ctrl' },
        { id: 'onFailed', label: 'onFailed', kind: 'ctrl' },
      ],
    },
    {
      id: 'notify',
      title: 'Notify Discord',
      cat: 'notify',
      x: 0.68,
      y: 0.66,
      ins: [{ id: 'run', label: 'run', kind: 'ctrl' }],
    },
  ]

  // from = source node's output port; to = target node's input port.
  var EDGES = [
    { from: ['schedule', 'trigger'], to: ['cond', 'run'] },
    { from: ['players', 'value'], to: ['cond', 'a'], data: true },
    { from: ['cond', 'onTrue'], to: ['restart', 'run'] },
    { from: ['restart', 'onComplete'], to: ['notify', 'run'] },
  ]

  var SVGNS = 'http://www.w3.org/2000/svg'
  var nodeEls = {} // id -> element
  var portEls = {} // "nodeId:side:portId" -> port dot element
  var edgeEls = [] // svg paths, index-aligned with EDGES

  // ── Build SVG edge layer ────────────────────────────────────────────────
  var svg = document.createElementNS(SVGNS, 'svg')
  svg.setAttribute('class', 'sched-edges')
  root.appendChild(svg)

  var tempPath = document.createElementNS(SVGNS, 'path')
  tempPath.setAttribute('class', 'sched-edge is-temp')
  tempPath.style.display = 'none'
  svg.appendChild(tempPath)

  function portKey(nodeId, side, portId) {
    return nodeId + ':' + side + ':' + portId
  }

  function makePort(nodeId, side, port) {
    var el = document.createElement('span')
    var shape = port.kind === 'data' ? 'sched-port--data' : 'sched-port--ctrl'
    el.className = 'sched-port sched-port--' + side + ' ' + shape
    var color = port.kind === 'data' ? dataColor(port.type) : ctrlColor(port.id)
    el.style.setProperty('--pc', color)
    el.setAttribute('data-node', nodeId)
    el.setAttribute('data-port', port.id)
    el.setAttribute('data-side', side)
    el.setAttribute('data-kind', port.kind)
    portEls[portKey(nodeId, side, port.id)] = el
    return el
  }

  function buildNode(n) {
    var el = document.createElement('div')
    el.className = 'sched-node'
    el.style.setProperty('--nc', CAT_COLOR[n.cat])
    el.setAttribute('data-node', n.id)

    var header = document.createElement('div')
    header.className = 'sched-node-header'
    var icon = document.createElement('span')
    icon.className = 'sched-node-icon'
    icon.textContent = CAT_ICON[n.cat]
    var title = document.createElement('span')
    title.className = 'sched-node-title'
    title.textContent = n.title
    header.appendChild(icon)
    header.appendChild(title)
    el.appendChild(header)

    var body = document.createElement('div')
    body.className = 'sched-node-body'
    var ins = n.ins || []
    var outs = n.outs || []
    var rows = Math.max(ins.length, outs.length, 1)

    for (var i = 0; i < rows; i++) {
      var inp = ins[i]
      var outp = outs[i]
      if (inp) {
        var rl = document.createElement('div')
        rl.className = 'sched-prow sched-prow--in'
        rl.appendChild(makePort(n.id, 'in', inp))
        rl.appendChild(document.createTextNode(inp.label))
        body.appendChild(rl)
      }
      if (outp) {
        var ro = document.createElement('div')
        ro.className = 'sched-prow sched-prow--out'
        ro.appendChild(document.createTextNode(outp.label))
        ro.appendChild(makePort(n.id, 'out', outp))
        // If there's also an input on this row, overlay them at the same top.
        if (inp) {
          ro.style.marginTop = '-20px'
        }
        body.appendChild(ro)
      }
    }

    el.appendChild(body)
    nodeEls[n.id] = el
    root.appendChild(el)
    return el
  }

  NODES.forEach(buildNode)

  // ── Layout ──────────────────────────────────────────────────────────────
  function layout() {
    var w = root.clientWidth
    var h = root.clientHeight
    NODES.forEach(function (n) {
      if (n._px === undefined) {
        n._px = Math.round(n.x * w)
        n._py = Math.round(n.y * h)
      }
      var el = nodeEls[n.id]
      el.style.left = n._px + 'px'
      el.style.top = n._py + 'px'
    })
  }

  function portCenter(nodeId, side, portId) {
    var el = portEls[portKey(nodeId, side, portId)]
    if (!el) return null
    var pr = el.getBoundingClientRect()
    var cr = root.getBoundingClientRect()
    return {
      x: pr.left + pr.width / 2 - cr.left,
      y: pr.top + pr.height / 2 - cr.top,
    }
  }

  function pathD(a, b) {
    var dx = Math.max(36, Math.abs(b.x - a.x) * 0.5)
    return (
      'M ' +
      a.x +
      ' ' +
      a.y +
      ' C ' +
      (a.x + dx) +
      ' ' +
      a.y +
      ' ' +
      (b.x - dx) +
      ' ' +
      b.y +
      ' ' +
      b.x +
      ' ' +
      b.y
    )
  }

  function buildEdgeEls() {
    edgeEls.forEach(function (p) {
      p.remove()
    })
    edgeEls = []
    EDGES.forEach(function (e) {
      var p = document.createElementNS(SVGNS, 'path')
      p.setAttribute('class', 'sched-edge')
      svg.insertBefore(p, tempPath)
      edgeEls.push(p)
    })
  }

  function redraw() {
    EDGES.forEach(function (e, i) {
      var a = portCenter(e.from[0], 'out', e.from[1])
      var b = portCenter(e.to[0], 'in', e.to[1])
      if (!a || !b) return
      edgeEls[i].setAttribute('d', pathD(a, b))
    })
  }

  buildEdgeEls()
  layout()
  requestAnimationFrame(redraw)

  // ── Dragging nodes ───────────────────────────────────────────────────────
  var drag = null // { node, startX, startY, originX, originY }

  root.addEventListener('pointerdown', function (e) {
    var portEl = e.target.closest('.sched-port')
    if (portEl) {
      startConnect(e, portEl)
      return
    }
    var nodeEl = e.target.closest('.sched-node')
    if (!nodeEl) return
    var n = nodeById(nodeEl.getAttribute('data-node'))
    drag = { node: n, sx: e.clientX, sy: e.clientY, ox: n._px, oy: n._py }
    nodeEl.classList.add('dragging')
    root.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  root.addEventListener('pointermove', function (e) {
    if (conn) {
      updateConnect(e)
      return
    }
    if (!drag) return
    var w = root.clientWidth
    var h = root.clientHeight
    var el = nodeEls[drag.node.id]
    var nx = drag.ox + (e.clientX - drag.sx)
    var ny = drag.oy + (e.clientY - drag.sy)
    // Keep the node's top-left within the canvas.
    nx = Math.max(0, Math.min(nx, w - el.offsetWidth))
    ny = Math.max(0, Math.min(ny, h - el.offsetHeight))
    drag.node._px = nx
    drag.node._py = ny
    el.style.left = nx + 'px'
    el.style.top = ny + 'px'
    redraw()
  })

  root.addEventListener('pointerup', function (e) {
    if (conn) {
      finishConnect(e)
      return
    }
    if (drag) {
      nodeEls[drag.node.id].classList.remove('dragging')
      drag = null
    }
  })

  root.addEventListener('pointercancel', function () {
    if (drag) {
      nodeEls[drag.node.id].classList.remove('dragging')
      drag = null
    }
    cancelConnect()
  })

  function nodeById(id) {
    for (var i = 0; i < NODES.length; i++) if (NODES[i].id === id) return NODES[i]
    return null
  }

  // ── Connecting ports ─────────────────────────────────────────────────────
  var conn = null // { nodeId, portId, side }

  function startConnect(e, portEl) {
    var side = portEl.getAttribute('data-side')
    // Only start a connection from an output port.
    if (side !== 'out') return
    conn = {
      nodeId: portEl.getAttribute('data-node'),
      portId: portEl.getAttribute('data-port'),
    }
    tempPath.style.display = ''
    root.setPointerCapture(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
  }

  function updateConnect(e) {
    var a = portCenter(conn.nodeId, 'out', conn.portId)
    if (!a) return
    var cr = root.getBoundingClientRect()
    var b = { x: e.clientX - cr.left, y: e.clientY - cr.top }
    tempPath.setAttribute('d', pathD(a, b))
  }

  function finishConnect(e) {
    var target = document.elementFromPoint(e.clientX, e.clientY)
    var inPort = target && target.closest ? target.closest('.sched-port--in') : null
    if (inPort) {
      var toNode = inPort.getAttribute('data-node')
      var toPort = inPort.getAttribute('data-port')
      // No self-loops, no exact duplicates.
      if (toNode !== conn.nodeId && !edgeExists(conn.nodeId, conn.portId, toNode, toPort)) {
        EDGES.push({ from: [conn.nodeId, conn.portId], to: [toNode, toPort] })
        buildEdgeEls()
        redraw()
      }
    }
    cancelConnect()
  }

  function edgeExists(fn, fp, tn, tp) {
    return EDGES.some(function (x) {
      return x.from[0] === fn && x.from[1] === fp && x.to[0] === tn && x.to[1] === tp
    })
  }

  function cancelConnect() {
    conn = null
    tempPath.style.display = 'none'
    tempPath.removeAttribute('d')
  }

  // ── Ambient "run" highlight travelling along the primary path ────────────
  if (!reduce) {
    var runOrder = ['schedule', 'cond', 'restart', 'notify']
    var runEdges = [
      ['schedule', 'trigger', 'cond', 'run'],
      ['cond', 'onTrue', 'restart', 'run'],
      ['restart', 'onComplete', 'notify', 'run'],
    ]
    var step = 0
    setInterval(function () {
      NODES.forEach(function (n) {
        nodeEls[n.id].classList.remove('is-running')
      })
      edgeEls.forEach(function (p) {
        p.classList.remove('is-live')
      })
      var id = runOrder[step % runOrder.length]
      if (nodeEls[id]) nodeEls[id].classList.add('is-running')
      // Light the edge leading into the active node.
      var prev = runEdges[(step - 1 + runEdges.length) % runEdges.length]
      if (step > 0) {
        EDGES.forEach(function (e, i) {
          if (
            e.from[0] === prev[0] &&
            e.from[1] === prev[1] &&
            e.to[0] === prev[2] &&
            e.to[1] === prev[3]
          ) {
            edgeEls[i].classList.add('is-live')
          }
        })
      }
      step++
    }, 1300)
  }

  // ── Re-layout on resize (debounced); resets node positions to the base. ──
  var resizeTimer = null
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function () {
      NODES.forEach(function (n) {
        n._px = undefined
        n._py = undefined
      })
      layout()
      redraw()
    }, 150)
  })
})()
