const POLYS = [
  [[-17,14],[0,20],[10,32],[20,32],[32,31],[43,12],[51,12],[41,-1],[40,-15],[35,-25],[25,-34],[18,-34],[12,-18],[9,4],[-8,4]],
  [[-10,36],[0,44],[15,46],[30,40],[45,40],[60,25],[70,20],[78,8],[90,22],[100,14],[105,10],[110,20],[120,30],[127,34],[136,35],[141,45],[146,50],[160,60],[179,65],[179,72],[140,75],[110,76],[80,74],[60,72],[30,70],[15,68],[5,60],[-5,58],[-10,50]],
  [[-168,65],[-160,58],[-140,60],[-125,49],[-120,35],[-110,25],[-98,18],[-88,20],[-80,25],[-75,35],[-65,45],[-55,50],[-60,58],[-75,62],[-85,70],[-100,72],[-125,70],[-140,70]],
  [[-45,60],[-25,70],[-20,78],[-40,83],[-58,78],[-55,68]],
  [[-80,10],[-70,10],[-60,5],[-50,0],[-35,-5],[-38,-15],[-48,-25],[-58,-35],[-65,-45],[-72,-53],[-75,-45],[-72,-30],[-70,-18],[-80,-5]],
  [[113,-22],[122,-18],[130,-12],[142,-11],[145,-18],[150,-25],[150,-37],[140,-38],[130,-32],[115,-35]]
];

const HUBS = [
  ['Rome', 12.5, 41.9], ['Riyadh', 46.7, 24.7], ['Nairobi', 36.8, -1.3], ['Singapore', 103.8, 1.35],
  ['Bogotá', -74.1, 4.7], ['Reykjavík', -21.9, 64.1], ['Seoul', 127, 37.6], ['Cape Town', 18.4, -33.9],
  ['Doha', 51.5, 25.3], ['Lisbon', -9.1, 38.7], ['Mexico City', -99.1, 19.4], ['Tokyo', 139.7, 35.7]
];

const X = lon => ((lon + 180) / 360) * 1000;
const Y = lat => ((84 - lat) / 144) * 500;

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

let cache = null;
function dots(step) {
  if (cache && cache.step === step) return cache.pts;
  const pts = [];
  for (let lon = -178; lon < 180; lon += step * 1.25) {
    for (let lat = 80; lat > -58; lat -= step) {
      if (POLYS.some(p => inPoly(lon, lat, p))) pts.push([X(lon), Y(lat)]);
    }
  }
  cache = { step, pts };
  return pts;
}

// mode: 'sensor' | 'arcs' | 'grid' | 'plot'
export function buildWorldMap(React, opts) {
  const o = opts || {};
  const E = React.createElement;
  const signal = o.signal || '#1F3FD8';
  const ink = 'rgba(237,233,223,';
  const kids = [];

  if (o.mode === 'silhouette') {
    POLYS.forEach((poly, i) => kids.push(E('path', {
      key: 'sil' + i,
      d: poly.map((p, j) => (j ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ') + ' Z',
      fill: ink + '0.85)', stroke: 'none'
    })));
    return E('div', {
      'aria-hidden': 'true',
      style: {
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: o.opacity == null ? 0.1 : o.opacity
      }
    }, E('svg', { viewBox: '0 0 1000 500', preserveAspectRatio: 'xMidYMid slice', style: { width: '118%', height: '100%' } }, kids));
  }

  dots(o.step || 3).forEach((p, i) => kids.push(E('rect', {
    key: 'd' + i, x: p[0], y: p[1], width: 1.5, height: 1.5, fill: ink + '0.85)'
  })));

  if (o.mode !== 'sensor') {
    for (let lon = -180; lon <= 180; lon += 30) {
      kids.push(E('line', { key: 'gv' + lon, x1: X(lon), y1: 0, x2: X(lon), y2: 500, stroke: ink + '0.24)', strokeWidth: 0.5 }));
    }
    for (let lat = 80; lat >= -60; lat -= 20) {
      kids.push(E('line', { key: 'gh' + lat, x1: 0, y1: Y(lat), x2: 1000, y2: Y(lat), stroke: ink + '0.24)', strokeWidth: 0.5 }));
    }
  }

  if (o.mode === 'sensor') {
    HUBS.forEach((c, i) => {
      const x = X(c[1]), y = Y(c[2]);
      [7, 15, 24, 34].forEach((r, j) => kids.push(E('circle', {
        key: 'r' + i + j, cx: x, cy: y, r, fill: 'none', stroke: signal, strokeWidth: 0.6, opacity: 0.5 - j * 0.1
      })));
    });
  }

  if (o.mode === 'arcs') {
    HUBS.slice(0, 7).forEach((b, i) => {
      if (!i) return;
      const a = HUBS[0];
      const ax = X(a[1]), ay = Y(a[2]), bx = X(b[1]), by = Y(b[2]);
      kids.push(E('path', {
        key: 'a' + i,
        d: 'M' + ax + ' ' + ay + ' Q' + (ax + bx) / 2 + ' ' + (Math.min(ay, by) - 50) + ' ' + bx + ' ' + by,
        fill: 'none', stroke: signal, strokeWidth: 0.6, opacity: 0.5
      }));
    });
  }

  if (o.mode === 'survey') {
    const pts = [[-58,-14],[-99,19],[-74,4],[-3,51],[12,42],[24,60],[37,-1],[18,-34],[51,25],[46,24],[77,28],[103,1],[121,31],[139,35],[151,-33],[-21,64],[-9,38],[35,31],[-122,37],[-79,43]];
    pts.forEach((p, i) => {
      const x = X(p[0]), y = Y(p[1]);
      kids.push(E('line', { key: 'sx' + i, x1: x - 3.5, y1: y, x2: x + 3.5, y2: y, stroke: signal, strokeWidth: 0.7 }));
      kids.push(E('line', { key: 'sy' + i, x1: x, y1: y - 3.5, x2: x, y2: y + 3.5, stroke: signal, strokeWidth: 0.7 }));
      kids.push(E('circle', { key: 'sc' + i, cx: x, cy: y, r: 6, fill: 'none', stroke: signal, strokeWidth: 0.5, opacity: 0.5 }));
    });
  }

  if (o.mode === 'grid') {
    for (let lon = -180; lon <= 180; lon += 10) {
      kids.push(E('line', { key: 'fv' + lon, x1: X(lon), y1: 0, x2: X(lon), y2: 500, stroke: ink + '0.1)', strokeWidth: 0.4 }));
    }
    for (let lat = 80; lat >= -60; lat -= 10) {
      kids.push(E('line', { key: 'fh' + lat, x1: 0, y1: Y(lat), x2: 1000, y2: Y(lat), stroke: ink + '0.1)', strokeWidth: 0.4 }));
    }
  }

  if (o.mode === 'radiate') {
    const ox = X(12.5), oy = Y(41.9);
    for (let a = 0; a < 360; a += 7.5) {
      const rad = (a * Math.PI) / 180;
      kids.push(E('line', {
        key: 'rl' + a, x1: ox, y1: oy,
        x2: ox + Math.cos(rad) * 1200, y2: oy + Math.sin(rad) * 700,
        stroke: signal, strokeWidth: 0.4, opacity: 0.35
      }));
    }
    [30, 90, 170, 270, 390].forEach((r, i) => kids.push(E('ellipse', {
      key: 're' + i, cx: ox, cy: oy, rx: r, ry: r * 0.62, fill: 'none',
      stroke: ink + '0.35)', strokeWidth: 0.6
    })));
  }

  if (o.mode === 'rhumb') {
    const pairs = [[1, 0], [3, 0], [6, 0], [10, 0], [4, 0], [11, 8], [2, 9], [7, 5]];
    pairs.forEach((p, i) => {
      const a = HUBS[p[0]], b = HUBS[p[1]];
      kids.push(E('line', {
        key: 'rh' + i, x1: X(a[1]), y1: Y(a[2]), x2: X(b[1]), y2: Y(b[2]),
        stroke: signal, strokeWidth: 0.6, opacity: 0.55
      }));
    });
    HUBS.forEach((c, i) => kids.push(E('circle', {
      key: 'rp' + i, cx: X(c[1]), cy: Y(c[2]), r: 3, fill: 'none', stroke: signal, strokeWidth: 0.8
    })));
  }

  if (o.mode === 'plot') {
    HUBS.forEach((c, i) => {
      const x = X(c[1]), y = Y(c[2]);
      kids.push(E('line', { key: 'cx' + i, x1: x - 5, y1: y, x2: x + 5, y2: y, stroke: signal, strokeWidth: 0.7 }));
      kids.push(E('line', { key: 'cy' + i, x1: x, y1: y - 5, x2: x, y2: y + 5, stroke: signal, strokeWidth: 0.7 }));
      kids.push(E('text', {
        key: 'ct' + i, x: x + 8, y: y - 6, fill: ink + '0.75)', fontSize: 7,
        fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em'
      }, c[0]));
    });
  }

  return E('div', {
    'aria-hidden': 'true',
    style: {
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: o.opacity == null ? 0.12 : o.opacity
    }
  }, E('svg', { viewBox: '0 0 1000 500', preserveAspectRatio: 'xMidYMid slice', style: { width: '118%', height: '100%' } }, kids));
}
