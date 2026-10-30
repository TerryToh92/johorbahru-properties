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

var LH = 14;  // line height for multi-line labels

// ═══════════════════════════════════════════════════════════════
//  Build one annotation group — frameless: dot + line + text only
// ═══════════════════════════════════════════════════════════════
function buildGroup(ann) {
  var color  = TYPE_COLOR[ann.type] || '#ffffff';
  var hasSub = !!(ann.sub && ann.sub.length);

  var g = svgEl('g');
  g.style.display    = 'none';
  g.style.willChange = 'transform';

  // Connector line (dot → label anchor)
  var line = svgEl('line', {
    stroke: 'rgba(255,255,255,0.70)',
    'stroke-width': '1',
    'stroke-dasharray': '3 2',
  });
  g.appendChild(line);

  // Endpoint dot
  var dot = svgEl('circle', {
    r: '4',
    fill: color,
    stroke: 'rgba(255,255,255,0.95)',
    'stroke-width': '1.5',
    filter: 'url(#ann-shd)',
  });
  g.appendChild(dot);

  // Title text — centered above dot
  var titleEl = svgEl('text', {
    'font-family': "'Inter', system-ui, sans-serif",
    'font-size': '11',
    'font-weight': '700',
    fill: '#ffffff',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    filter: 'url(#ann-txt)',
  });
  titleEl.textContent = ann.label;
  g.appendChild(titleEl);

  // Subtitle text
  var subEl = null;
  if (hasSub) {
    subEl = svgEl('text', {
      'font-family': "'Inter', system-ui, sans-serif",
      'font-size': '9',
      'font-weight': '400',
      fill: color,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      filter: 'url(#ann-txt)',
    });
    subEl.textContent = ann.sub;
    g.appendChild(subEl);
  }

  return { g: g, line: line, dot: dot,
           titleEl: titleEl, subEl: subEl, hasSub: hasSub };
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

    // Text sits directly above the dot, line goes straight up
    var lineLen = 40;  // px gap from dot to text
    var tx = dotX;
    var ty = dotY - lineLen;

    // Clamp inside viewport
    var mg = 8;
    tx = Math.max(mg + 60, Math.min(W - mg - 60, tx));
    ty = Math.max(mg + (grp.hasSub ? LH * 2 : LH), Math.min(dotY - 8, ty));

    if (grp.hasSub) {
      grp.titleEl.setAttribute('x', tx);
      grp.titleEl.setAttribute('y', ty - LH * 0.5);
      grp.subEl.setAttribute('x', tx);
      grp.subEl.setAttribute('y', ty + LH * 0.5);
    } else {
      grp.titleEl.setAttribute('x', tx);
      grp.titleEl.setAttribute('y', ty);
    }

    // Vertical line from dot up to text baseline
    grp.line.setAttribute('x1', dotX);
    grp.line.setAttribute('y1', dotY - 4);
    grp.line.setAttribute('x2', tx);
    grp.line.setAttribute('y2', ty + (grp.hasSub ? LH : LH * 0.5) + 2);
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

  // Filter definitions
  var defs = svgEl('defs');
  defs.innerHTML =
    // Dot glow
    '<filter id="ann-shd" x="-100%" y="-100%" width="300%" height="300%">' +
      '<feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="rgba(0,0,0,0.9)"/>' +
    '</filter>' +
    // Text stroke/shadow for legibility without a box
    '<filter id="ann-txt" x="-10%" y="-30%" width="120%" height="160%">' +
      '<feMorphology in="SourceAlpha" operator="dilate" radius="2" result="expanded"/>' +
      '<feFlood flood-color="rgba(0,0,0,0.85)" result="color"/>' +
      '<feComposite in="color" in2="expanded" operator="in" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge>' +
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
