// The silk thread: one line below the opening scene that draws itself down the page as the
// visitor scrolls, swings through the margins and the open space between sections, and comes
// to rest as the line above the name's four words, ending at serico. It is the only scroll
// effect on the page.
//
// How the route is found, once the fonts are in (or after 1.5 s without them), and again only
// when the width changes (or a late font moves the page):
//  1. Every text block, the video, the buttons, the list of steps and the "Now" section as a
//     whole are obstacles, each with its own clearance (40px around the large lines).
//  2. On a coarse grid (one row per DY px, one column per DX px) we look for the best line
//     going down the page that touches no obstacle (dynamic programming): bends and steepness
//     cost, being deep in open space pays, so it swings into the room beside headings and
//     between sections instead of hugging a margin. It starts in the right half under the
//     opening scene, keeps left of the motto, and ends left of and above the four words.
//  3. That route only shows the way. The thread itself passes through a few of its points
//     (one every SPACING px or so) as one centripetal Catmull–Rom curve, then a quarter
//     circle into the line through the knots (or, with the words stacked, straight down
//     onto the first one).
//  4. The curve is checked against every obstacle. Where it comes too close, the route's own
//     point at that depth joins the curve (or replaces the nearest one) and the whole curve is
//     fitted again; where it bends tighter than MIN_RADIUS, the nearest point that is not
//     holding it clear is dropped and it is fitted again. No point is ever nudged on its own,
//     so there are no kinks.
// If no route exists (phones: margins too narrow), only the line through the four words is
// drawn. `.night[data-silk]` says which it was, and how the fit went.
//
// Markup (Page.astro): `.night` holds `svg.silk` with `.fall` (the descent) and `.line`
// (through the knots), each a glow path and a core path, plus the gradients #silk-fall and
// #silk-line. The knots are `.knot` elements in `.stops`. Once the script has drawn the line,
// `.night` gets the class `has-silk` (the plain CSS line between the knots then steps aside).

type Kind = 'big' | 'wide' | 'text' | 'button' | 'soft';
type Box = { l: number; t: number; r: number; b: number; kind: Kind };
type Pt = { x: number; y: number };

// Grid for the route search.
const DY = 12;
let DX = 12; // 8 on narrower screens, whose margins are only a few columns wide
const MAX_STEP = 16; // columns per row: the steepest slope is 16 px across per px down
// Clearance, by what the thread passes: the large lines (section headings, the motto), other
// text, buttons, and boxes that are not text (the video frame, the list of steps, a whole
// section kept clear). `search` is what the route search keeps; `least` is the hard minimum
// the finished curve is checked against.
const PAD: Record<Kind, { search: { x: number; y: number }; least: { x: number; y: number } }> = {
  big: { search: { x: 44, y: 46 }, least: { x: 40, y: 40 } },
  // The heading of the three limits on wide screens: the thread falls past it in the outer third
  // of the margin (86px wide at 1440), not hard by the words. The hard minimum stays that of 'big'.
  wide: { search: { x: 58, y: 46 }, least: { x: 40, y: 40 } },
  text: { search: { x: 22, y: 18 }, least: { x: 20, y: 14 } },
  button: { search: { x: 26, y: 22 }, least: { x: 24, y: 18 } },
  soft: { search: { x: 18, y: 14 }, least: { x: 16, y: 12 } },
};
// The route keeps at least this far from the screen's left and right edges (less on tablets,
// whose margins are narrow).
const edgeFor = (W: number) => (W < 900 ? 12 : 20);
// How strongly the route is drawn into open space, away from text and the screen's edges
// (in the same units as a bend), and how far away counts as fully open.
const OPEN = 3.5;
const OPEN_FAR = 320;
// What steepness costs: it keeps long, nearly level crossings for places with no other way.
const SLOPE = 0.15;
// The drawn curve passes through a few points of the route, about this far apart along it,
// and never bends tighter than MIN_RADIUS.
const SPACING = 380;
const MIN_RADIUS = 80;
// The arc into the line above the words: as wide as there is room for, up to this.
const LANDING = 160;
// The point being drawn sits this far down the screen, and the line under the words is drawn
// over this much of a screen of scrolling.
const HEAD = 0.75;
const LINE_SPAN = 0.3;

const f = (n: number) => n.toFixed(1);

// Text blocks, as tight boxes around their lines (not their CSS boxes, which can be much wider
// than the text); boxes kept whole: the steps (hairlines included) and the video frame; a
// section kept clear as a whole (the situations, the three limits and "Now": the thread must
// not run down between their columns); and buttons. (The four words are covered by their text: the thread ends on their
// line.)
const TEXT = 'h2:not(.visually-hidden), h3, p, dt, dd, .step-num, .word, .from, .means, .find a, .find h2, .posts a';
const BIG = '.display, .motto';
// Large lines the thread keeps further from, where the margin is wide enough (see PAD.wide).
const WIDE = '.limits .display';
const WIDE_FROM = 1280;
const WHOLE = '.steps, .frame, .roles-head, .roles';
// Sections laid out in columns, kept clear as wholes: the situations, the three limits, "Now".
const CLEAR = '.signs, .limits, .now';

function obstacles(scope: Element, origin: DOMRect): Box[] {
  const rel = (r: DOMRect, kind: Kind): Box => ({ l: r.left - origin.left, t: r.top - origin.top, r: r.right - origin.left, b: r.bottom - origin.top, kind });
  const out: Box[] = [];
  const range = document.createRange();
  const ink = (el: Element, kind: Kind): Box | null => {
    range.selectNodeContents(el);
    let box: Box | null = null;
    for (const r of range.getClientRects()) {
      if (!r.width || !r.height) continue;
      const b = rel(r, kind);
      box = box ? { ...box, l: Math.min(box.l, b.l), t: Math.min(box.t, b.t), r: Math.max(box.r, b.r), b: Math.max(box.b, b.b) } : b;
    }
    return box;
  };
  const texts = [...scope.querySelectorAll(TEXT)];
  if (scope.matches(TEXT)) texts.push(scope);
  for (const el of texts) {
    if (el.closest('svg, .visually-hidden, [hidden]')) continue;
    const box = ink(el, el.matches(WIDE) && innerWidth >= WIDE_FROM ? 'wide' : el.matches(BIG) ? 'big' : 'text');
    if (box) out.push(box);
  }
  for (const el of scope.querySelectorAll(WHOLE)) out.push(rel(el.getBoundingClientRect(), 'soft'));
  for (const el of scope.querySelectorAll(CLEAR)) {
    const box = ink(el, 'soft');
    if (box) out.push(box);
  }
  for (const el of scope.querySelectorAll('button:not([hidden])')) out.push(rel(el.getBoundingClientRect(), 'button'));
  return out;
}

const bounds = (boxes: Box[]): Box =>
  boxes.reduce((a, b) => ({ l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) }), {
    l: Infinity,
    t: Infinity,
    r: -Infinity,
    b: -Infinity,
  });

// The first box a point is inside, once each box is grown by its kind's clearance.
const touching = (p: Pt, boxes: Box[], which: 'search' | 'least') =>
  boxes.find((b) => {
    const pad = PAD[b.kind][which];
    return p.x > b.l - pad.x && p.x < b.r + pad.x && p.y > b.t - pad.y && p.y < b.b + pad.y;
  });

function cubicPts(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return out;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// A smooth curve through the points: centripetal Catmull–Rom (it neither loops nor overshoots
// at uneven spacing), as cubic Béziers. `before` and `after` are ghost points that set the
// direction at the two ends. Returns the Bézier pieces.
function catmullRom(pts: Pt[], before: Pt, after: Pt): [Pt, Pt, Pt, Pt][] {
  const all = [before, ...pts, after];
  const out: [Pt, Pt, Pt, Pt][] = [];
  for (let i = 1; i < all.length - 2; i++) {
    const [p0, p1, p2, p3] = [all[i - 1], all[i], all[i + 1], all[i + 2]];
    const d1 = Math.max(1e-3, Math.sqrt(dist(p0, p1)));
    const d2 = Math.max(1e-3, Math.sqrt(dist(p1, p2)));
    const d3 = Math.max(1e-3, Math.sqrt(dist(p2, p3)));
    const b1 = (k: 'x' | 'y') => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2));
    const b2 = (k: 'x' | 'y') => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2));
    out.push([p1, { x: b1('x'), y: b1('y') }, { x: b2('x'), y: b2('y') }, p2]);
  }
  return out;
}

// Points along Bézier pieces, about `step` px apart, each with the index of its piece.
type Sample = Pt & { piece: number };
function sampleCurve(pieces: [Pt, Pt, Pt, Pt][], step = 6): Sample[] {
  const out: Sample[] = [];
  pieces.forEach((c, piece) => {
    const n = Math.max(4, Math.ceil((dist(c[0], c[1]) + dist(c[1], c[2]) + dist(c[2], c[3])) / step));
    for (const p of cubicPts(...c, n).slice(out.length ? 1 : 0)) out.push({ ...p, piece });
  });
  return out;
}

// The tightest bend along evenly spaced points (radius of the circle through each point and
// its neighbours two steps away), and where it is.
function tightest(pts: Pt[]): { r: number; at: Pt } {
  let best = { r: Infinity, at: pts[0] };
  for (let i = 2; i < pts.length - 2; i++) {
    const a = pts[i - 2];
    const b = pts[i];
    const c = pts[i + 2];
    const cross = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    if (cross < 1e-6) continue;
    const r = (dist(a, b) * dist(b, c) * dist(a, c)) / (2 * cross);
    if (r < best.r) best = { r, at: b };
  }
  return best;
}

const toD = (pieces: [Pt, Pt, Pt, Pt][], move = true) =>
  (move ? `M ${f(pieces[0][0].x)} ${f(pieces[0][0].y)}` : '') +
  pieces.map(([, c1, c2, e]) => ` C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(e.x)} ${f(e.y)}`).join('');

// For the `data-silk` note: the depth at which the last search ran out of room.
let stuckAt = -1;

type Grid = { cols: number; rows: number; edge: number; blocked: Uint8Array; open: Float32Array };

// Which cells the route may use, and how deep in open space each one is (distance to the
// nearest blocked cell in its row, capped at OPEN_FAR, as 0–1).
function grid(W: number, rows: number, boxes: Box[]): Grid {
  const cols = Math.floor(W / DX) + 1;
  const blocked = new Uint8Array(rows * cols);
  for (const b of boxes) {
    const pad = PAD[b.kind].search;
    const k0 = Math.max(0, Math.floor((b.t - pad.y) / DY));
    const k1 = Math.min(rows - 1, Math.ceil((b.b + pad.y) / DY));
    if (k0 > k1) continue;
    const j0 = Math.max(0, Math.floor((b.l - pad.x) / DX));
    const j1 = Math.min(cols - 1, Math.ceil((b.r + pad.x) / DX));
    for (let k = k0; k <= k1; k++) blocked.fill(1, k * cols + j0, k * cols + j1 + 1);
  }
  const edge = Math.ceil(edgeFor(W) / DX);
  for (let k = 0; k < rows; k++) {
    blocked.fill(1, k * cols, k * cols + edge);
    blocked.fill(1, k * cols + cols - edge, k * cols + cols);
  }
  const open = new Float32Array(rows * cols);
  for (let k = 0; k < rows; k++) {
    let last = -Infinity;
    for (let j = 0; j < cols; j++) {
      if (blocked[k * cols + j]) last = j;
      open[k * cols + j] = j - last;
    }
    last = Infinity;
    for (let j = cols - 1; j >= 0; j--) {
      if (blocked[k * cols + j]) last = j;
      const dist = Math.min(open[k * cols + j], last - j) * DX;
      open[k * cols + j] = Math.min(1, dist / OPEN_FAR);
    }
  }
  return { cols, rows, edge, blocked, open };
}

// The best route down the grid: few and gentle bends, as deep in open space as it can get.
// It starts anywhere in [startX], must be in the free stretch along the left edge of the
// screen at the rows in `leftAt`, and ends going straight down at column `endCol`.
// Returns one x per row, or null.
function search(g: Grid, leftAt: Set<number>, startX: [number, number], endCol: number): number[] | null {
  const { cols, rows, blocked, open, edge } = g;
  const sums = new Uint16Array(rows * (cols + 1));
  for (let k = 0; k < rows; k++) {
    let s = 0;
    for (let j = 0; j < cols; j++) {
      s += blocked[k * cols + j];
      sums[k * (cols + 1) + j + 1] = s;
    }
  }
  const spanFree = (k: number, a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return sums[k * (cols + 1) + hi + 1] - sums[k * (cols + 1) + lo] === 0;
  };

  const S = 2 * MAX_STEP + 1;
  let cost = new Float32Array(cols * S).fill(Infinity);
  let next = new Float32Array(cols * S);
  const parent = new Int32Array(rows * cols * S).fill(-1);
  for (let j = Math.ceil(startX[0] / DX); j <= Math.floor(startX[1] / DX); j++) {
    if (j < cols && !blocked[j]) cost[j * S + MAX_STEP] = 0;
  }
  for (let k = 0; k < rows - 1; k++) {
    next.fill(Infinity);
    const left = leftAt.has(k + 1);
    for (let j = 0; j < cols; j++) {
      for (let s = 0; s < S; s++) {
        const c = cost[j * S + s];
        if (c === Infinity) continue;
        const d = s - MAX_STEP;
        for (let s2 = 0; s2 < S; s2++) {
          const d2 = s2 - MAX_STEP;
          const j2 = j + d2;
          if (j2 < 0 || j2 >= cols) continue;
          const bend = d2 - d;
          const c2 = c + bend * bend + SLOPE * d2 * d2 - OPEN * open[(k + 1) * cols + j2];
          const at = j2 * S + s2;
          if (c2 >= next[at]) continue;
          if (blocked[(k + 1) * cols + j2] || !spanFree(k, j, j2) || !spanFree(k + 1, j, j2)) continue;
          if (left && !spanFree(k + 1, edge, j2)) continue;
          next[at] = c2;
          parent[(k + 1) * cols * S + at] = j * S + s;
        }
      }
    }
    [cost, next] = [next, cost];
    if (!cost.some((c) => c !== Infinity)) {
      stuckAt = (k + 1) * DY;
      return null;
    }
  }
  const end = endCol * S + MAX_STEP;
  if (endCol < 0 || endCol >= cols || cost[end] === Infinity) return null;
  const xs = new Array<number>(rows);
  let at = end;
  for (let k = rows - 1; k >= 0; k--) {
    xs[k] = Math.floor(at / S) * DX;
    at = parent[k * cols * S + at];
    if (k > 0 && at < 0) return null;
  }
  return xs;
}

export function startSilk(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('svg.silk');
  const stops = root.querySelector<HTMLElement>('.stops');
  if (!svg || !stops) return;
  const fall = [...svg.querySelectorAll<SVGPathElement>('.fall path')];
  const line = [...svg.querySelectorAll<SVGPathElement>('.line path')];
  const gradFall = svg.querySelector<SVGLinearGradientElement>('#silk-fall')!;
  const gradLine = svg.querySelector<SVGLinearGradientElement>('#silk-line')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let fallLen = 0;
  let lineLen = 0;
  // For samples along the thread: length from the start, and how far down the page the
  // drawing point must be for it to be drawn. Never decreasing, so it can be searched.
  let lens: number[] = [];
  let depth: number[] = [];

  // Why the thread took the shape it did, on `.night[data-silk]`: "full", or "line: <reason>".
  const why = (r: string) => (root.dataset.silk = r);

  function knotsAndLine() {
    const origin = root.getBoundingClientRect();
    const knots = [...stops!.querySelectorAll('.knot')].map((k) => {
      const r = k.getBoundingClientRect();
      return { x: (r.left + r.right) / 2 - origin.left, y: (r.top + r.bottom) / 2 - origin.top };
    });
    const a = knots[0];
    const b = knots[knots.length - 1];
    return { fall: '', line: `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`, knots };
  }
  plan.lineOnly = knotsAndLine;

  function plan(): { fall: string; line: string; knots: Pt[] } {
    const origin = root.getBoundingClientRect();
    const W = root.clientWidth;
    const knots = [...stops!.querySelectorAll('.knot')].map((k) => {
      const r = k.getBoundingClientRect();
      return { x: (r.left + r.right) / 2 - origin.left, y: (r.top + r.bottom) / 2 - origin.top };
    });
    const first = knots[0];
    const last = knots[knots.length - 1];
    const lineD = `M ${f(first.x)} ${f(first.y)} L ${f(last.x)} ${f(last.y)}`;
    const onlyLine = { fall: '', line: lineD, knots };
    const level = Math.abs(first.y - last.y) <= 1;
    // Phones: the margins are too narrow for anything but the line beside the stacked words.
    if (!level && W < 600) return why('line: phone'), onlyLine;

    const boxes = obstacles(root, origin);
    const motto = bounds(obstacles(root.querySelector('.name .motto')!, origin));
    const edge = edgeFor(W);
    DX = W < 1100 ? 8 : 12;
    // Tablets: a full-width heading leaves 46px of margin, so 40px from it cannot be kept there.
    const bigLeast = W < 900 ? 28 : 40;
    PAD.big.least = { x: bigLeast, y: 40 };
    PAD.big.search = { x: bigLeast + 4, y: 46 };

    // Where the descent ends and how it joins the words. Level words: a quarter circle of
    // radius R bends it right into the first knot, as wide as the room left of the words
    // allows (up to LANDING). Stacked words (tablets): it comes straight down onto the first
    // knot and the line carries on down through the others.
    const stacked = !level;
    let end: Pt;
    let arc: [Pt, Pt, Pt, Pt] | null = null;
    if (stacked) {
      const wordTop = stops!.querySelector('.word')!.getBoundingClientRect().top - origin.top;
      const rows = Math.floor((wordTop - PAD.text.search.y) / DY) - 2;
      if (rows * DY < motto.b + PAD.big.search.y && first.x > motto.l - PAD.big.search.x) return why('line: no room above the words'), onlyLine;
      end = { x: Math.round(first.x / DX) * DX, y: rows * DY };
      const k = (first.y - end.y) * 0.45;
      arc = [end, { x: end.x, y: end.y + k }, { x: first.x, y: first.y - k }, { x: first.x, y: first.y }];
    } else {
      const col = Math.round((first.x - Math.min(LANDING, first.x - edge - 4)) / DX);
      const R = first.x - col * DX;
      if (R < 24) return why('line: no room for the arc'), onlyLine;
      end = { x: col * DX, y: first.y - R };
      const k = 0.5523 * R;
      arc = [end, { x: end.x, y: end.y + k }, { x: first.x - k, y: first.y }, { x: first.x, y: first.y }];
    }
    const rows = Math.floor(end.y / DY);

    const g = grid(W, rows + 1, boxes);
    // Beside the motto it keeps to the left, so it can land on the first word from the left.
    // It also keeps left from the three limits down: the page is long now, and this way it
    // swings across in the wide gap after the video and its table (the busiest scene) instead
    // of running down one margin for most of the page.
    // Where the margin beside the limits' heading is too narrow for its clearance (1024 wide),
    // that cannot be done, and it keeps left beside the motto only, crossing just before it.
    const leftFrom = (y: number) => {
      const set = new Set<number>();
      for (let k = Math.ceil(Math.min(y, motto.t) / DY); k <= Math.min(rows, Math.floor(motto.b / DY)); k++) set.add(k);
      return set;
    };
    const limits = root.querySelector('.limits');
    stuckAt = -1;
    let xs = limits ? search(g, leftFrom(bounds(obstacles(limits, origin)).t), [W * 0.55, W * 0.8], Math.round(end.x / DX)) : null;
    if (!xs) {
      stuckAt = -1;
      xs = search(g, leftFrom(motto.t), [W * 0.55, W * 0.8], Math.round(end.x / DX));
    }
    if (!xs) return why(`line: no clear route (stuck at y=${stuckAt})`), onlyLine;

    // The route, broadly smoothed (its column-by-column jitter would otherwise show up as small
    // wiggles), as points; where a smoothed point is not clear, the route's own. Its length
    // along the way.
    const route: Pt[] = xs.map((x, k) => {
      let sx = 0;
      let w = 0;
      for (let i = -12; i <= 12; i++) {
        const q = Math.min(rows, Math.max(0, k + i));
        const gw = Math.exp(-(i * i) / 50);
        sx += xs[q] * gw;
        w += gw;
      }
      const p = { x: sx / w, y: k * DY };
      return touching(p, boxes, 'search') ? { x, y: k * DY } : p;
    });
    route[route.length - 1] = end;
    const along = [0];
    for (let i = 1; i < route.length; i++) along.push(along[i - 1] + dist(route[i - 1], route[i]));
    const length = along[along.length - 1];
    const nearestAt = (s: number) => {
      let i = 0;
      while (i < along.length - 1 && along[i] < s) i++;
      return i;
    };

    // The last stretch comes straight down into the arc (or onto the first word): a point
    // directly above the end, so the curve meets the arc already falling, without a corner.
    const lead = Math.min(route.length - 2, Math.max(1, route.length - 1 - Math.round(Math.max(96, (first.x - end.x) * 0.9) / DY)));
    route[lead] = { x: end.x, y: route[lead].y };
    const ghostBefore = { x: route[0].x, y: -160 };
    const ghostAfter = { x: end.x, y: end.y + 160 };
    const tooClose = (pts: Pt[]) => {
      for (const p of pts) {
        if (p.x < edge - 4 || p.x > W - edge + 4) return { p, box: null as Box | null };
        const box = touching(p, boxes, 'least');
        if (box) return { p, box };
      }
      return null;
    };
    const clearPoint = (p: Pt) => !touching(p, boxes, 'least') && p.x >= edge && p.x <= W - edge;

    // Fit the curve through points about `spacing` px apart: keep it clear, thin out bunched
    // points, then ease the tight bends. Returns the curve, or null if it cannot be kept clear.
    const attempt = (spacing: number) => {
      // A few points of the route, evenly spaced along it. Indexes into `route`, in order.
      const parts = Math.max(3, Math.round(length / spacing));
      let picks: number[] = [0];
      for (let i = 1; i < parts; i++) picks.push(nearestAt((length * i) / parts));
      picks = picks.filter((i) => i < lead - Math.round((spacing * 0.4) / DY));
      picks.push(lead, route.length - 1);
      picks = [...new Set(picks)].sort((a, b) => a - b);
      // Points added to keep clear of something: not removed to ease a bend.
      const kept = new Set<number>([0, lead, route.length - 1]);

      // Fit, check, and adjust whole points until the curve is clear everywhere and bends gently.
      // Points are moved as wholes (`moved` holds each one's shift), never single samples.
      const moved = new Map<number, Pt>();
      const point = (i: number) => {
        const m = moved.get(i);
        return m ? { x: route[i].x + m.x, y: route[i].y + m.y } : route[i];
      };
      const fit = () => catmullRom(picks.map(point), ghostBefore, ghostAfter);
      const pushes = new Map<number, number>();
      let best: [Pt, Pt, Pt, Pt][] | null = null;
      let note = '';
      for (let tries = 0; tries < 120; tries++) {
        const pieces = fit();
        const pts = sampleCurve(pieces);
        const hit = tooClose(pts) ?? (arc ? tooClose(cubicPts(...arc, 40).map((p) => ({ ...p, piece: pieces.length - 1 }))) : null);
        if (hit) {
          const piece = (hit.p as Sample).piece ?? pieces.length - 1;
          const ends = [picks[piece], picks[piece + 1]].filter((i) => i !== undefined && i !== route.length - 1);
          // Away from the box: from its nearest point to the sample (or sideways at the edge).
          let away: Pt = { x: hit.p.x < W / 2 ? 1 : -1, y: 0 };
          if (hit.box) {
            const nx = Math.max(hit.box.l, Math.min(hit.p.x, hit.box.r));
            const ny = Math.max(hit.box.t, Math.min(hit.p.y, hit.box.b));
            const dx = hit.p.x - nx;
            const dy = hit.p.y - ny;
            const len = Math.hypot(dx, dy);
            away = len > 0.5 ? { x: dx / len, y: dy / len } : { x: hit.p.x < (hit.box.l + hit.box.r) / 2 ? -1 : 1, y: 0 };
          }
          const key = Math.round(hit.p.y / 60);
          const n = (pushes.get(key) ?? 0) + 1;
          pushes.set(key, n);
          let shifted = false;
          if (n <= 6) {
            for (const i of ends) {
              const m = moved.get(i) ?? { x: 0, y: 0 };
              const next = { x: m.x + away.x * 14, y: m.y + away.y * 14 };
              const p = { x: route[i].x + next.x, y: route[i].y + next.y };
              if (clearPoint(p)) {
                moved.set(i, next);
                shifted = true;
              }
            }
          }
          if (!shifted) {
            // Moving did not help: let the route's own point at that depth (clear, with room to
            // spare) join the curve.
            // (If that point is already on the curve, the nearest ones either side that are not.)
            const at = Math.min(route.length - 1, Math.max(0, Math.round(hit.p.y / DY)));
            let add = -1;
            for (let off = 0; off < 40 && add < 0; off++) {
              for (const c of [at - off, at + off]) {
                if (c > 0 && c < route.length - 1 && !picks.includes(c)) {
                  add = c;
                  break;
                }
              }
            }
            if (add < 0) {
              note = 'could not clear';
              break;
            }
            picks = [...picks, add].sort((a, b) => a - b);
            kept.add(add);
          }
          note = `cleared in ${tries + 1} fits`;
          continue;
        }
        best = pieces;
        break;
      }
      if (!best) return null;

      // Ease the tight bends: around the tightest one, try moving each of the three nearest points
      // (whole) a little in eight directions, or leaving one out; keep whichever change widens
      // the tightest bend the most while the curve stays clear. Repeat until every bend is wide
      // enough or nothing helps.
      const bendOf = () => {
        const pieces = fit();
        const pts = sampleCurve(pieces);
        return { pieces, clear: !tooClose(pts), bend: tightest(pts) };
      };
      let state = bendOf();
      // First, thin out: repairs can leave points bunched together, which makes small wiggles.
      // Leave out any point (closest-spaced first) whose absence keeps the curve clear and makes
      // no bend tighter.
      for (let changed = true; changed; ) {
        changed = false;
        const gap = (i: number) => {
          const k = picks.indexOf(i);
          return Math.min(dist(point(picks[k - 1] ?? i), point(i)) || Infinity, dist(point(i), point(picks[k + 1] ?? i)) || Infinity);
        };
        const order = picks.filter((i) => i !== 0 && i !== lead && i !== route.length - 1).sort((a, b) => gap(a) - gap(b));
        for (const i of order) {
          const before = picks;
          picks = before.filter((j) => j !== i);
          const t = bendOf();
          if (t.clear && t.bend.r >= Math.min(MIN_RADIUS, state.bend.r)) {
            state = t;
            changed = true;
            break;
          }
          picks = before;
        }
      }
      for (let round = 0; round < 30 && state.bend.r < MIN_RADIUS; round++) {
        const at = state.bend.at.y / DY;
        const near = picks
          .filter((i) => i !== route.length - 1 && i !== lead)
          .sort((a, b) => Math.abs(a - at) - Math.abs(b - at))
          .slice(0, 3);
        let bestTry: { apply: () => void; r: number } | null = null;
        const consider = (apply: () => void, undo: () => void) => {
          apply();
          const t = bendOf();
          if (t.clear && t.bend.r > (bestTry?.r ?? state.bend.r + 1)) bestTry = { apply, r: t.bend.r };
          undo();
        };
        for (const i of near) {
          const m = moved.get(i) ?? { x: 0, y: 0 };
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
            const next = { x: m.x + dx * 28, y: m.y + dy * 28 };
            consider(
              () => moved.set(i, next),
              () => moved.set(i, m),
            );
          }
          if (i !== 0) {
            const before = picks;
            consider(
              () => (picks = before.filter((j) => j !== i)),
              () => (picks = before),
            );
          }
        }
        if (!bestTry) break;
        (bestTry as { apply: () => void }).apply();
        state = bendOf();
        note = `eased in ${round + 1} rounds`;
      }
      return { pieces: state.pieces, r: state.bend.r, n: picks.length, note };
    };
    // Sparse first; closer points follow the route more tightly where room is short. If none
    // of those keeps every bend wide enough, sparser ones, which smooth out small jogs in a
    // narrow margin (768 wide, the long page: a jog beside "Now" before the swing across).
    let result: { pieces: [Pt, Pt, Pt, Pt][]; r: number; n: number; note: string } | null = null;
    for (const spacing of [SPACING, 300, 230, 170, 460, 540]) {
      const t = attempt(spacing);
      if (t && (!result || t.r > result.r)) result = t;
      if (result && result.r >= MIN_RADIUS) break;
    }
    if (!result) return why('line: route touches text'), onlyLine;
    why(`full (${result.n} points; tightest bend ${Math.round(result.r)}px)`);
    return { fall: toD(result.pieces) + (arc ? toD([arc], false) : ''), line: lineD, knots };
  }

  // Where the knots were when the route was last found: if they have not moved, nothing on the
  // page has, and a change of height alone needs no new route.
  let knotsAt = '';
  const knotsNow = () => {
    const origin = root.getBoundingClientRect();
    return [...stops!.querySelectorAll('.knot')].map((k) => {
      const r = k.getBoundingClientRect();
      return `${Math.round(r.left - origin.left)},${Math.round(r.top - origin.top)}`;
    }).join(' ');
  };
  let runs = 0;
  let first: Pt = { x: 0, y: 0 };
  let level = true;

  function layout() {
    let p: ReturnType<typeof plan>;
    try {
      const t0 = performance.now();
      p = plan();
      root.dataset.silk += `; ${Math.round(performance.now() - t0)} ms`;
    } catch (e) {
      // Never let the ornament break the page: fall back to the line through the words.
      why(`line: ${e}`);
      p = plan.lineOnly();
    }
    // How many times the route has been found since the page opened, for anyone checking.
    root.dataset.silkRuns = String(++runs);
    knotsAt = knotsNow();
    for (const el of fall) el.setAttribute('d', p.fall);
    for (const el of line) el.setAttribute('d', p.line);
    first = p.knots[0];
    const last = p.knots[p.knots.length - 1];
    level = Math.abs(first.y - last.y) < 1;
    gradFall.setAttribute('y2', f(first.y));
    gradLine.setAttribute('x1', f(first.x));
    gradLine.setAttribute('y1', f(first.y));
    gradLine.setAttribute('x2', f(level ? last.x : first.x + 0.01));
    gradLine.setAttribute('y2', f(level ? first.y : last.y));
    fallLen = p.fall ? fall[0].getTotalLength() : 0;
    lineLen = line[0].getTotalLength();
    for (const el of fall) el.style.strokeDasharray = `${fallLen} ${fallLen + 1}`;
    for (const el of line) el.style.strokeDasharray = `${lineLen} ${lineLen + 1}`;
    measure();
    root.classList.add('has-silk');
  }

  // The light part, redone when only the height changes (a phone's toolbar, say): the drawing's
  // size, and how far down the screen the drawing point must be for each stretch of the thread.
  function measure() {
    const W = root.clientWidth;
    const H = root.offsetHeight;
    svg!.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg!.setAttribute('width', String(W));
    svg!.setAttribute('height', String(H));
    // How far down the drawing point must be for each sample: on the descent, its own depth;
    // along the level line, spread over LINE_SPAN of a screen so it runs from 丝 to serico.
    const vh = innerHeight;
    lens = [];
    depth = [];
    let v = 0;
    const step = 6;
    for (let s = 0; fallLen > 0 && s <= fallLen; s += step) {
      v = Math.max(v, fall[0].getPointAtLength(s).y);
      lens.push(s);
      depth.push(v);
    }
    for (let s = 0; s <= lineLen; s += step) {
      const y = level ? first.y + (s / lineLen) * vh * LINE_SPAN : line[0].getPointAtLength(s).y;
      v = Math.max(v, y);
      lens.push(fallLen + s);
      depth.push(v);
    }
    lens.push(fallLen + lineLen);
    depth.push(v);
    // The drawing point can only get as deep as the bottom of the page allows. If the end of
    // the thread lies deeper, ease the last stretch so it still finishes, smoothly.
    const reach = H - (1 - HEAD) * vh - 4;
    const end = depth[depth.length - 1];
    if (end > reach) {
      const a = Math.max(0, Math.min(first.y - vh * 0.5, reach - vh * 0.6));
      depth = depth.map((d) => (d <= a ? d : a + ((d - a) * (reach - a)) / (end - a)));
    }
    draw();
  }

  function draw() {
    let drawn = fallLen + lineLen;
    if (!reduce.matches) {
      const head = innerHeight * HEAD - root.getBoundingClientRect().top;
      const end = depth[depth.length - 1];
      if (head <= depth[0]) drawn = 0;
      else if (head < end) {
        let lo = 0;
        let hi = depth.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (depth[mid] <= head) lo = mid;
          else hi = mid;
        }
        const span = depth[hi] - depth[lo];
        drawn = lens[lo] + (span > 0 ? ((head - depth[lo]) / span) * (lens[hi] - lens[lo]) : 0);
      }
    }
    const show = (paths: SVGPathElement[], len: number, d: number) => {
      const amount = Math.max(0, Math.min(len, d));
      for (const p of paths) {
        p.style.strokeDashoffset = String(len - amount);
        p.style.visibility = amount > 0.5 ? 'visible' : 'hidden';
      }
    };
    show(fall, fallLen, drawn);
    show(line, lineLen, drawn - fallLen);
  }

  // Finding the route takes up to ~250 ms (more at 768 wide), so it is found once, when the
  // fonts are in, and again only when the width changes, once the resizing stops.
  let started = false;
  let timer = 0;
  const relayout = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => requestAnimationFrame(layout), 150);
  };
  let measureQueued = false;
  const remeasure = () => {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      measure();
    });
  };
  // A new width means a new route. The same width with another height (a phone's toolbar, a
  // taller window) keeps the route and only redoes the light part, unless the page itself moved
  // under it (its knots are somewhere else now).
  let lastW = -1;
  const changed = () => {
    if (!started) return;
    if (root.clientWidth !== lastW) {
      lastW = root.clientWidth;
      relayout();
    } else if (knotsNow() !== knotsAt) relayout();
    else remeasure();
  };
  let drawQueued = false;
  const onScroll = () => {
    if (!started || drawQueued) return;
    drawQueued = true;
    requestAnimationFrame(() => {
      drawQueued = false;
      draw();
    });
  };

  // Until then nothing of it shows but the plain CSS line between the four words, the same as
  // without the script (the descent appears once, already in its place; it never jumps).
  const start = () => {
    if (started) return;
    started = true;
    lastW = root.clientWidth;
    layout();
  };
  const fonts = document.fonts;
  if (fonts) {
    void root.offsetHeight; // lays the page out, so the fonts it uses are asked for now
    fonts.ready.then(() => requestAnimationFrame(start));
    // Fonts that never come (a slow or blocked connection) do not keep the thread away.
    setTimeout(start, 1500);
    // Fonts that come after that, or later on, move text: then the route is found again.
    fonts.addEventListener('loadingdone', () => {
      if (started && knotsNow() !== knotsAt) relayout();
    });
  } else start();
  new ResizeObserver(changed).observe(root);
  addEventListener('resize', changed);
  addEventListener('scroll', onScroll, { passive: true });
  reduce.addEventListener('change', () => started && draw());
}
