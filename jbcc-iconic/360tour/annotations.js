'use strict';
(function () {

// ═══════════════════════════════════════════════════════════════
//  ANNOTATION CONFIG
//  Edit this section to adjust labels, positions and layout.
//
//  yaw   : horizontal angle in radians (matches data.js hotspot yaw)
//  pitch : vertical angle in radians   (matches data.js hotspot pitch)
//  ox    : label-box offset in px from dot, positive = right
//  oy    : label-box offset in px from dot, positive = down
//  sub   : optional second line (leave '' to hide)
//  type  : transport | building | road | country | project
// ═══════════════════════════════════════════════════════════════
var ANNOTATIONS = [
  { yaw:  0.601,  pitch:  0.189,  label: 'CIQ Checkpoint',         sub: 'Cross-border to Singapore',   ox: -105, oy:  -70,  type: 'transport' },
  { yaw:  0.728,  pitch:  0.062,  label: 'Bukit Chagar RTS',        sub: 'RTS Link · ~2.0 km',          ox:  110, oy:  -85,  type: 'transport' },
  { yaw:  1.847,  pitch: -0.062,  label: 'Paragon Suites @ CIQ',    sub: '',                            ox:    0, oy: -100,  type: 'building'  },
  { yaw:  1.426,  pitch:  0.014,  label: 'Menara MBJB',             sub: '',                            ox: -115, oy: -115,  type: 'building'  },
  { yaw:  1.532,  pitch: -0.183,  label: 'Astaka Residences',        sub: '',                            ox:  105, oy:  -70,  type: 'building'  },
  { yaw:  1.244,  pitch: -0.014,  label: 'SKS Mall',                sub: '',                            ox:  -95, oy:  -50,  type: 'building'  },
  { yaw:  2.804,  pitch:  0.158,  label: 'EDL Highway',             sub: '',                            ox:    0, oy:  -80,  type: 'road'      },
  { yaw: -0.397,  pitch: -0.070,  label: 'V Summer Place',          sub: '',                            ox:  -90, oy:  -65,  type: 'building'  },
  { yaw: -0.155,  pitch:  0.253,  label: 'Causewayz Square',         sub: '',                            ox:   90, oy:  -70,  type: 'building'  },
  { yaw: -0.855,  pitch: -0.124,  label: 'R&F Princess Cove P3',    sub: '',                            ox:  -95, oy:  -60,  type: 'building'  },
  { yaw: -1.467,  pitch:  0.727,  label: 'Putra Indah Condo',       sub: '',                            ox:  -90, oy:  -55,  type: 'building'  },
  { yaw: -1.663,  pitch:  0.032,  label: 'Singapore',               sub: 'Woodlands / Tuas',            ox:    0, oy:  -80,  type: 'country'   },
  { yaw: -2.955,  pitch:  0.036,  label: 'The Zone @ Stulang',      sub: '',                            ox:    0, oy:  -80,  type: 'building'  },
  { yaw:  0.587,  pitch:  1.463,  label: 'The Iconic Site',         sub: 'PGB Development',             ox:   95, oy:  -55,  type: 'project'   },
];

// Category accent colours
var TYPE_COLOR = {
  transport: '#c9961a',   // gold
  building:  '#7eb8d4',   // sky blue
  road:      '#a8c890',   // sage green
  country:   '#c4a0e8',   // soft purple
  project:   '#f0c040',   // bright gold
};

// ═══════════════════════════════════════════════════════════════
//  SVG utilities
// ═══════════════════════════════════════════════════════════════
var NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  var e = document.createElementNS(NS, tag);
  if (attrs) {
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
  }
  return e;
}

// ═══════════════════════════════════════════════════════════════
//  Label metrics
// ═══════════════════════════════════════════════════════════════
var BAR  = 3;   // accent bar width (px)
var PX   = 9;   // text padding horizontal
var PY   = 5;   // text padding vertical
var LH   = 16;  // single line height

function approxWidth(text, fontSize) {
  // Inter condensed-ish: ~0.57× at font-size
  return Math.ceil(text.length * fontSize * 0.57) + BAR + PX * 2 + 4;
}

// ═══════════════════════════════════════════════════════════════
//  Build one annotation group (pre-created, updated each frame)
// ═══════════════════════════════════════════════════════════════
function buildGroup(ann) {
  var color  = TYPE_COLOR[ann.type] || '#ffffff';
  var hasSub = !!(ann.sub && ann.sub.length);

  var rW = Math.max(
    approxWidth(ann.label, 11),
    hasSub ? approxWidth(ann.sub, 9) : 0,
    80
  );
  var rH = hasSub ? PY * 2 + LH * 2 : PY * 2 + LH;

  var g = svgEl('g');
  g.style.display    = 'none';
  g.style.willChange = 'transform';

  // Connector line (dot → rect edge)
  var line = svgEl('line', {
    stroke: 'rgba(255,255,255,0.60)',
    'stroke-width': '1',
  });
  g.appendChild(line);

  // Endpoint dot
  var dot = svgEl('circle', {
    r: '3.5',
    fill: color,
    stroke: 'rgba(255,255,255,0.90)',
    'stroke-width': '1.2',
  });
  g.appendChild(dot);

  // Background rect
  var rect = svgEl('rect', {
    width: rW, height: rH,
    rx: '3',
    fill: 'rgba(4,14,28,0.82)',
    stroke: 'rgba(255,255,255,0.10)',
    'stroke-width': '0.5',
    filter: 'url(#ann-shd)',
  });
  g.appendChild(rect);

  // Left accent bar
  var bar = svgEl('rect', {
    width: BAR, height: rH,
    rx: '1.5',
    fill: color,
  });
  g.appendChild(bar);

  // Title
  var titleEl = svgEl('text', {
    'font-family': "'Inter', system-ui, sans-serif",
    'font-size': '11',
    'font-weight': '600',
    fill: '#ffffff',
    'dominant-baseline': 'middle',
  });
  titleEl.textContent = ann.label;
  g.appendChild(titleEl);

  // Subtitle
  var subEl = null;
  if (hasSub) {
    subEl = svgEl('text', {
      'font-family': "'Inter', system-ui, sans-serif",
      'font-size': '9',
      'font-weight': '400',
      fill: 'rgba(255,255,255,0.55)',
      'dominant-baseline': 'middle',
    });
    subEl.textContent = ann.sub;
    g.appendChild(subEl);
  }

  return { g: g, line: line, dot: dot, rect: rect, bar: bar,
           titleEl: titleEl, subEl: subEl, rW: rW, rH: rH, hasSub: hasSub };
}

// ═══════════════════════════════════════════════════════════════
//  Per-frame update
// ═══════════════════════════════════════════════════════════════
var groups = [];
var svgRoot;

function tick() {
  requestAnimationFrame(tick);

  var mz = window._mzViewer;
  if (!mz) return;

  var view;
  try { view = mz.view(); } catch (e) { return; }
  if (!view || !view.coordinatesToScreen) return;

  var W = window.innerWidth;
  var H = window.innerHeight;

  for (var i = 0; i < ANNOTATIONS.length; i++) {
    var ann = ANNOTATIONS[i];
    var grp = groups[i];

    var sc = view.coordinatesToScreen({ yaw: ann.yaw, pitch: ann.pitch });

    // Hide when behind camera or far off-screen
    if (!sc || sc.x < -30 || sc.x > W + 30 || sc.y < -30 || sc.y > H + 30) {
      grp.g.style.display = 'none';
      continue;
    }
    grp.g.style.display = '';

    var dotX = sc.x;
    var dotY = sc.y;

    grp.dot.setAttribute('cx', dotX);
    grp.dot.setAttribute('cy', dotY);

    // Label rect: centered on (dotX + ox, dotY + oy)
    var lx = dotX + ann.ox - grp.rW / 2;
    var ly = dotY + ann.oy - grp.rH / 2;

    // Clamp label inside viewport
    var mg = 6;
    lx = Math.max(mg, Math.min(W - grp.rW  - mg, lx));
    ly = Math.max(mg, Math.min(H - grp.rH - mg, ly));

    grp.rect.setAttribute('x', lx);
    grp.rect.setAttribute('y', ly);
    grp.bar.setAttribute('x',  lx);
    grp.bar.setAttribute('y',  ly);

    // Text x: after bar + padding
    var tx = lx + BAR + PX;
    if (grp.hasSub) {
      grp.titleEl.setAttribute('x', tx);
      grp.titleEl.setAttribute('y', ly + PY + LH * 0.5);
      grp.subEl.setAttribute('x', tx);
      grp.subEl.setAttribute('y', ly + PY + LH * 1.48);
    } else {
      grp.titleEl.setAttribute('x', tx);
      grp.titleEl.setAttribute('y', ly + grp.rH / 2);
    }

    // Line endpoint: nearest point on rect perimeter to dot
    var ex = Math.max(lx, Math.min(lx + grp.rW, dotX));
    var ey = Math.max(ly, Math.min(ly + grp.rH, dotY));
    grp.line.setAttribute('x1', dotX);
    grp.line.setAttribute('y1', dotY);
    grp.line.setAttribute('x2', ex);
    grp.line.setAttribute('y2', ey);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Initialise
// ═══════════════════════════════════════════════════════════════
function init() {
  // Full-viewport SVG overlay, pointer-events pass through to Marzipano
  svgRoot = svgEl('svg');
  svgRoot.id = 'ann-svg';
  svgRoot.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:100%', 'height:100%',
    'pointer-events:none',
    'z-index:50',
    'overflow:visible',
  ].join(';');

  // Drop-shadow filter definition
  var defs = svgEl('defs');
  defs.innerHTML =
    '<filter id="ann-shd" x="-25%" y="-25%" width="150%" height="150%">' +
      '<feDropShadow dx="0" dy="1" stdDeviation="2.5" ' +
        'flood-color="rgba(0,0,0,0.7)"/>' +
    '</filter>';
  svgRoot.appendChild(defs);

  // Build and add one group per annotation
  for (var i = 0; i < ANNOTATIONS.length; i++) {
    var grp = buildGroup(ANNOTATIONS[i]);
    groups.push(grp);
    svgRoot.appendChild(grp.g);
  }

  document.body.appendChild(svgRoot);
  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
