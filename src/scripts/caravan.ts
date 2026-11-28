// The caravan in the opening painting walks: along the golden road to the city on the horizon,
// and when it is well on its way, a grander one comes over the ridge behind it — its light first,
// then the camels, with a strand of silk streaming over them; and so on, for ever.
//
// Everything is in the painting's own pixels (public/hero/hero_{wide,tall}.webp) and is mapped onto
// the canvas the way CSS `object-fit: cover` places the picture (sky.ts passes the mapping in). It
// draws on the sky's canvas, inside the sky's own animation frame:
//   drawGround(ctx) — the patches that hide the painted caravan, the light each caravan leaves on
//                     the road it has walked, the camels, the dune in front;
//   drawLights(ctx) — with the sky's other lights: lanterns, dust, silk.
// All of its light is laid *over* what is there (never added to it). The canvas is empty over most of
// the painting and solid where a patch or a camel is: added light comes out stronger on the solid
// parts (a patch's edge shows as a line in any glow that crosses it), and lights stacked by adding
// burn out to white. Laid over, a glow is the same everywhere and never paler than its own colour.
// The camels' bodies are cut from the painting itself; only their legs are drawn, stepping in a
// camel's pace. Until its pictures have loaded, or where the road would run under the text, it stays
// off and the painted caravan is left as it is (`active` is false).
//
// The data (src/scripts/caravan/*.json) and pictures (public/hero/caravan/) are made by scripts kept
// outside this repository: change the paintings, re-make them.

import ROUTE from './caravan/route.json';
import BODIES from './caravan/bodies.json';
import PATCH from './caravan/patch.json';

type Pt = number[];
// [x0, y0, x1, y1] on the canvas (the words' rects may carry more: see setup)
type Rect = number[];
type Cell = (typeof BODIES.cells)[number];
type Kind = 'wide' | 'tall';
const BASE = '/hero/caravan/';

type Road = { pts: Pt[]; scale: number[]; T: number[]; n: number; total: number; Ttot: number; lead0: number; gapT: number; first: Member[]; rise: number; unit: number; gap1: number; sinks: number };
type Member = { off: number; body: number; at?: number[]; step?: number; lamp0?: number[] };
type Team = { n: number; t: number; grand: boolean };
type Walker = { i: number; t: number; f: number; x: number; y: number; s: number; face: number; narrow: number; legs: number; reach: number; hold: number; lamp0?: number[]; body: number; light: number; seen: number; grand: boolean; cell: Cell; c: Team };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; a: number; rise?: boolean };

// A laden camel walks at about 1.3 m/s, a stride (all four feet once) every 1.3 s or so. The painted
// camels are 20 px tall, some 2.1 m: so 12 px a second, and unhurried — they are carrying it all the way.
const SPEED = 12; // image px per second for a camel at full size (scale 1)
const DEPTH = 0.3; // farther camels go slower on screen, by scale^DEPTH (less than in proportion: the far road would drag)
const HIDDEN_RUSH = 3; // out of sight (behind a dune), they walk this many times faster
const NEXT_AT = 0.52; // the next caravan sets out when this one's leader has done this share of its time on the road
// ... but the first one to follow the painted caravan (the first grand one) sets out this many seconds
// after the page's caravan has appeared: it is over the ridge some 3 s after that (later where the
// words stand over the start of the road: see `early`). (The painted caravan starts a quarter of the
// way along the road; by NEXT_AT the grand one would be a long wait. Not sooner than this: three
// seconds earlier, the tail of its silk lies over the rear of the painted caravan.)
const SECOND_AT = 27;
const FADE_IN = 0.8; // seconds: the painted caravan hands over to the drawn one
const SET_OFF = 2.6; // seconds: from standing to full speed
const HERALD = 6; // seconds of warm light behind the ridge before a caravan comes over it
// The walk: a camel paces. Both legs of one side swing together (the fore foot a moment after the hind),
// then the other side's; each foot stays down two thirds of the time and is lifted only a little.
const CADENCE = 0.75; // strides a second, for a camel 20 px tall (smaller ones step a little quicker)
const DUTY = 0.66; // the share of a stride a foot is on the ground
const REACH = (DUTY * SPEED) / CADENCE / 2; // how far a foot is set down ahead of its hip: what it takes not to slide
const STANCE = [0.05, 0.57, 0.1, 0.6, 0.02, 0.54]; // where in its stride each painted camel stands, leader first
const WARM = '255, 172, 92';
const GOLD = '255, 206, 140';

// The light each caravan leaves on the road: where they tread, it lights up. The road and the sand
// under the caravan are brightest — a light that walks with them (see POOL and HOT below); behind
// them it cools over two or three lengths to a faint band along the road they have walked (round the
// hairpins too: both arms have been walked), which sinks back to the night over tens of seconds.
// It lights the painting itself: what it adds is the sand under it, tinted warm, so the sand's own
// ripples and ridges show brighter — lit sand, not a yellow haze laid over it. Drawn before the
// dune in front, so that dune hides it where it hides the road (the near end of that dune, which is
// the same slope as the lit one beside it, is lit with it: see litDune).
// How it is put on: the canvas lies over the painting, and is empty wherever nothing is drawn — so
// nothing can be *added* to the painting through it (a colour drawn on an empty canvas covers what
// is under it, however it is blended on the canvas). So the sand is kept as it looks fully lit
// (the painting's own pixels plus the light), and the band is that, laid over the painting as
// thickly as the light is strong: half strength shows half the light.
const BEAM = {
  // r: the band's half-width at full size (image px); gain: how much the lit sand brightens;
  // fade: seconds after the last camel has passed until a stretch of road is dark again
  plain: { r: 34, gain: 3.0, fade: 24 },
  grand: { r: 50, gain: 3.0, fade: 40 },
};
const FLAT = 0.4; // the band lies on the ground: this much as tall as wide (flat: it must not spill onto the next arm of a hairpin)
// The pool that goes with the caravan — what is seen first, at the page's own size. Under the camels,
// and for a few seconds of road behind the last one, the band is at its fullest, and a second, fainter
// light falls on the slope beside the road (most of it on the near side, which faces us): a pool of
// light that walks with them. Behind it the light draws in to the road again and sinks away as the
// band above. Fainter on the slope than on the road, on purpose: at full strength a lit slope is a pale slab.
//   tall: the pool's height for its width (the band's is FLAT);  down: how far below the road its
//   centre lies, in half-heights;  strength: of full light;  lasts: seconds behind the last camel
//   until it is gone
const POOL = { tall: 0.75, down: 0.35, strength: 0.65, lasts: 6 };
// ... and the road itself lights up where they tread, and cools again behind them. The road is
// nearly as bright as its own colour goes (the light above adds almost nothing to it), so in the lit
// sand the road and a few px to either side are drawn toward lantern gold: `by` this far at the
// middle of the road, over `r` px to either side at full size (picture px). The gold of the painted
// lanterns' own glow on the ridge; it can only ever reach that colour, never white.
const HOT = { by: 1, r: 7 };
const HOT_GOLD = '255, 204, 128';
const TINT = '255, 150, 36'; // deep amber gold, as the lantern-lit ridges in the painting (little blue: on the night's violet sand more of it turns the lit slope pink)
const CAP = 200; // no lit pixel goes above this brightness (luma), and no channel clips: lit gold, never white

// Catmull–Rom spline through [x, y, visibility] points (and whatever more each point carries),
// sampled evenly by length.
function trace(pts: Pt[], n: number) {
  const raw: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 30; k++) {
      const t = k / 30, t2 = t * t, t3 = t2 * t;
      raw.push(p1.map((_, j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  raw.push(pts[pts.length - 1].slice());
  const len = [0];
  for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const total = len[len.length - 1];
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const want = (i / (n - 1)) * total;
    while (j < len.length - 2 && len[j + 1] < want) j++;
    const u = (want - len[j]) / (len[j + 1] - len[j] || 1);
    out.push(raw[j].map((v, k) => v + (raw[j + 1][k] - v) * u));
  }
  return { pts: out, total };
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

// Where a foot is at phase u of the stride, relative to the ground under its hip: set down `reach`
// ahead, it stays where it is on the sand while the camel walks over it (so it goes back at walking
// speed), then is lifted a little and swung forward. The third number is how far the leg is folded.
function footAt(u: number, reach: number, lift: number): Pt {
  if (u < DUTY) return [reach * (1 - (2 * u) / DUTY), 0, 0];
  const v = (u - DUTY) / (1 - DUTY);
  const up = Math.sin(Math.PI * v);
  return [-reach * Math.cos(Math.PI * v), -lift * up, up];
}

function soft(color: string, stops: [number, number][]) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, a] of stops) r.addColorStop(at, `rgba(${color}, ${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export type Caravan = ReturnType<typeof createCaravan>;

export function createCaravan() {
  const route = ROUTE as Record<Kind, { horizon: number; near: number; size: number; pts: Pt[]; unit?: number; enter?: number; counts?: number[]; painted?: { at: number[]; body: number; lamp: number[] }[]; occluders: { src: string; x: number; y: number; w: number; h: number; lit?: number[] }[] }>;
  const bodies = BODIES;
  // The pictures load only once a layout lets the caravan walk.
  const loaded = new Map<string, HTMLImageElement>();
  const img = (src: string) => {
    let i = loaded.get(src);
    if (!i) {
      i = new Image();
      i.decoding = 'async';
      i.src = BASE + src;
      loaded.set(src, i);
    }
    return i;
  };
  const patches = { wide: [PATCH.wide], tall: [PATCH.tall] };
  const patchSrc = { wide: ['patch_wide.webp'], tall: ['patch_tall.webp'] };
  const pics = () => [img('bodies.webp'), ...patchSrc[kind].map(img), ...route[kind].occluders.map((o) => img(o.src))];
  // (... and the painting itself must be in: its patches and camels are not to show on an empty scene)
  const arrived = () => pics().every((i) => i.complete && i.naturalWidth > 0) && !!art && art.complete && art.naturalWidth > 0;
  // ... and the lit sand made from that painting (see litWhenIdle): the first caravan's light is there from the start
  const ready = () => arrived() && !!lit && litOf === picture();

  const glow = soft(WARM, [[0, 1], [0.15, 0.7], [0.4, 0.25], [0.7, 0.06], [1, 0]]);
  const lamp = soft('255, 118, 40', [[0, 0.9], [0.3, 0.55], [0.65, 0.15], [1, 0]]); // the painted lanterns are orange, not white
  const wick = soft('255, 222, 160', [[0, 1], [0.45, 0.5], [1, 0]]); // ... with a small pale-gold heart, as painted
  const ember = soft(GOLD, [[0, 1], [0.35, 0.45], [1, 0]]);
  const spark = soft('255, 150, 70', [[0, 1], [0.35, 0.4], [1, 0]]); // the sparks before a caravan: warm orange, not pale gold
  // the light behind the ridge before a caravan comes over it: deep orange air, a paler heart
  const haze = soft('255, 146, 84', [[0, 0.9], [0.3, 0.55], [0.65, 0.16], [1, 0]]);
  const heart = soft('255, 204, 132', [[0, 0.85], [0.4, 0.4], [1, 0]]);
  // the light's footprint (a mask: only its alpha counts), close to a Gaussian, with no edge
  const pool = soft('255, 255, 255', [[0, 1], [0.25, 0.72], [0.5, 0.3], [0.75, 0.07], [1, 0]]);

  // The painting's sand around the road (with the patches on it), as it looks fully lit.
  // Made once, in the picture's own pixels, when the pictures are in.
  let art: HTMLImageElement | null = null;
  let lit: { c: HTMLCanvasElement; x: number; y: number } | null = null;
  let litOf = ''; // the picture it was made from (the same <img> shows the wide one or the tall one)
  const picture = () => (art ? art.currentSrc || art.src : '');
  function litSand() {
    // (only while the caravan walks, and only from the painting its road is on)
    if (lit || !on || !art || !art.complete || !art.naturalWidth || /tall/.test(picture()) !== (kind === 'tall')) return lit;
    const pts = R.pts;
    const x0 = Math.max(0, Math.min(...pts.map((p) => p[0])) - 120), x1 = Math.min(art.naturalWidth, Math.max(...pts.map((p) => p[0])) + 120);
    const y0 = Math.max(0, Math.min(...pts.map((p) => p[1])) - 50), y1 = Math.min(art.naturalHeight, Math.max(...pts.map((p) => p[1])) + 70);
    const c = document.createElement('canvas');
    c.width = Math.round(x1 - x0);
    c.height = Math.round(y1 - y0);
    const g = c.getContext('2d')!;
    g.drawImage(art, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    patches[kind].forEach((P, i) => g.drawImage(img(patchSrc[kind][i]), P.x - x0, P.y - y0, P.w, P.h));
    // what light adds to each pixel is in proportion to the pixel (its texture stays), tinted warm,
    // and a little more in proportion where the sand is dark: at night the hollows are lit too, the
    // already bright road and ridges are not burnt out
    const [t0, t1, t2] = TINT.split(',').map((v) => +v / 255);
    const gain = BEAM.grand.gain;
    try {
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      // (about 230 000 pixels: worked out channel by channel, with nothing allocated in the loop)
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], gr = px[i + 1], b = px[i + 2];
        const l = Math.max(8, 0.3 * r + 0.55 * gr + 0.15 * b);
        // dark sand is lifted a little more in proportion than the bright road and ridges
        const m = Math.min(1.6, (110 / l) ** 0.45);
        // the light is warm whatever it falls on: what it adds follows the sand's brightness more than
        // its colour (the night's violet sand, lifted in its own colour, turns lavender and misty)
        const a0 = (0.4 * r + 0.6 * l) * t0 * m * gain;
        const a1 = (0.4 * gr + 0.6 * l) * t1 * m * gain;
        const a2 = (0.4 * b + 0.6 * l) * t2 * m * gain;
        // at full light (the mask's 1) the pixel may rise only to CAP in brightness, and no channel past
        // 250: the whole added colour is scaled down together, so it stays amber (a channel clipping
        // first would shift it toward white)
        let fit = 1;
        if (a0 > 0) fit = Math.min(fit, Math.max(0, 250 - r) / a0);
        if (a1 > 0) fit = Math.min(fit, Math.max(0, 250 - gr) / a1);
        if (a2 > 0) fit = Math.min(fit, Math.max(0, 250 - b) / a2);
        const la = 0.3 * a0 + 0.55 * a1 + 0.15 * a2;
        if (la > 0) fit = Math.min(fit, Math.max(0, CAP - (0.3 * r + 0.55 * gr + 0.15 * b)) / la);
        px[i] = r + a0 * fit;
        px[i + 1] = gr + a1 * fit;
        px[i + 2] = b + a2 * fit;
      }
      g.putImageData(d, 0, 0);
    } catch {
      // (the pixels could not be read: a plain warm lift instead)
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(${TINT}, 0.3)`;
      g.fillRect(0, 0, c.width, c.height);
    }
    // a fresh copy that was never read back: the browser can keep it on the GPU (the one read from it
    // may be kept in memory, and sent over again every frame it is drawn)
    const out = document.createElement('canvas');
    out.width = c.width;
    out.height = c.height;
    const og = out.getContext('2d')!;
    og.drawImage(c, 0, 0);
    // the lit road (see HOT): soft dots strung along it add up to one even line on a canvas of their
    // own (reusing `c`) — only how solid it is; it is then filled with the gold, and laid over the lit
    // sand. (Dots of the gold itself would add up past it, to white, where they overlap.)
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter';
    const ds = road.total / (road.n - 1);
    for (let i = 0; i < road.n; i += 2) {
      const r = Math.max(2, HOT.r * road.scale[i]);
      // (a dot's cross-section is about 0.62·r: this much of each makes the line solid over its middle
      // third and soft outside it)
      g.globalAlpha = Math.min(1, (2 * ds) / (0.4 * r));
      g.drawImage(pool, road.pts[i][0] - x0 - r, road.pts[i][1] - y0 - r, 2 * r, 2 * r);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = `rgb(${HOT_GOLD})`;
    g.fillRect(0, 0, c.width, c.height);
    og.globalAlpha = HOT.by;
    og.drawImage(c, 0, 0);
    lit = { c: out, x: x0, y: y0 };
    litOf = picture();
    return lit;
  }
  // where the pool's mask is drawn each frame (reused; grows when it must)
  const scratch = document.createElement('canvas');
  const sg = scratch.getContext('2d')!;

  let kind: Kind = 'wide';
  let R = route.wide;
  let map = (p: Pt): Pt => p;
  let k = 1; // screen px per image px
  let on = false;
  let why: { at: Pt; text: number[] } | null = null;
  let text: Rect[] = [];
  let rearAt = 0; // the words on the opening scene, in canvas px
  let gate = -1; // new caravans are seen only after this point of the road (text before it)
  // When they are, they come into sight this much later (seconds) than they would at the start of
  // the road, and the light before them with them. (They do not set out sooner to make up for it:
  // how far a caravan is behind the one before it is the same in every layout, or its silk would
  // lie over the other's rear camels where the words stand close.) Fixed once a new caravan's light
  // shows: a later change of layout must not make that light jump.
  let early = 0;
  let heraldAt = 0; // where on the road the light shows: clear of the words, so it is never cut by them
  let xMax = 1e9; // the picture's right edge on screen, at the drift's widest (image px)
  let stopAt = 1e9; // (the tall painting) where along the road the words end the walk
  let clock = 0;
  let road: Road = null!;

  function build(r: (typeof route)[Kind]) {
    const n = 1500;
    const { pts, total } = trace(r.pts, n);
    const ds = total / (n - 1);
    // How large a camel is at each point: by how far below the horizon it stands — or, where the
    // painting's depth does not run so evenly (the tall one: a near ridge, then roads far off), as each
    // point says. `unit`: how much larger the painted camels are there than the bodies' own size.
    const unit = r.unit ?? 1;
    const scale = pts.map((p) => (p.length > 3 ? p[3] : clamp((p[1] - r.horizon) / (r.near - r.horizon), 0.12, 1.15)) * unit);
    const T = [0];
    for (let i = 1; i < n; i++) {
      const s = (scale[i] + scale[i - 1]) / 2;
      const v = SPEED * s ** DEPTH * ((pts[i][2] + pts[i - 1][2]) / 2 > 0.05 ? 1 : HIDDEN_RUSH);
      T.push(T[i - 1] + ds / v);
    }
    const near = (x: number, y: number) => {
      let best = 0, bd = 1e9;
      pts.forEach((p, i) => {
        const d = Math.hypot(p[0] - x, p[1] - y);
        if (d < bd) (bd = d), (best = i);
      });
      return best;
    };
    const gapT = (kind === 'tall' ? 43 : 25) / SPEED;
    // The painted caravan: each camel's own place on the road (as a time behind its leader) and its body.
    const cells = bodies.cells;
    const spots: { j: number; at: number[]; lamp?: number[] }[] = r.painted ? r.painted.map((q) => ({ j: q.body, at: q.at, lamp: q.lamp })) : cells.map((c, j) => ({ j, at: c.painted }));
    const painted = spots.map((q) => ({ ...q, T: T[near(q.at[0], q.at[1])] })).sort((a, b) => b.T - a.T);
    const lead0 = painted[0].T;
    // (each stands mid-stride as it is painted, legs apart: its step starts from there)
    const first = painted.map((p, i) => ({ off: lead0 - p.T, body: p.j, at: p.at, step: STANCE[i % STANCE.length] - p.T * CADENCE * Math.sqrt(20 / cells[p.j].height) , lamp0: p.lamp && [cells[p.j].foot[0] + (p.lamp[0] - p.at[0]) / unit, cells[p.j].foot[1] + (p.lamp[1] - p.at[1]) / unit] }));
    // where new caravans come into sight
    let rise = pts.findIndex((p) => p[2] > 0.5);
    // How far along the road (in its own time) the painted caravan's leader is when the first to follow
    // sets out: SECOND_AT seconds after the page's caravan appears — or, where the road comes in from
    // outside the picture (`enter`), so that it is just out of the picture as the page opens.
    const gap1 = r.enter != null ? lead0 - T[Math.max(0, pts.findIndex((p) => p[0] >= r.enter!))] : lead0 + SECOND_AT - FADE_IN - SET_OFF / 2;
    // where, past the painted caravan, the road first goes out of sight (or its end)
    const lead = near(painted[0].at[0], painted[0].at[1]);
    const gone = pts.findIndex((p, i) => i > lead && p[2] < 0.05);
    return { pts, scale, T, n, total, Ttot: T[n - 1], lead0, gapT, first, rise, unit, gap1, sinks: gone < 0 ? n - 1 : gone };
  }

  function at(t: number) {
    const { T, n } = road;
    if (t <= 0) return 0;
    if (t >= T[n - 1]) return n - 1;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (T[m] <= t) lo = m;
      else hi = m;
    }
    return lo + (t - T[lo]) / (T[hi] - T[lo] || 1);
  }
  function lerp(arr: number[], f: number): number;
  function lerp(arr: Pt[], f: number): Pt;
  function lerp(arr: (number | Pt)[], f: number) {
    const i = Math.floor(f), u = f - i;
    const a = arr[i], b = arr[Math.min(road.n - 1, i + 1)];
    if (typeof a === 'number') return a + ((b as number) - a) * u;
    return a.map((v, j) => v + ((b as Pt)[j] - v) * u);
  }

  // Who walks in caravan n: time offsets behind the leader and which painted body each one has.
  const rosters = new Map<number, Member[]>();
  function roster(n: number, grand: boolean): Member[] {
    if (n === 0) return road.first;
    const key = n * 2 + (grand ? 1 : 0);
    if (rosters.has(key)) return rosters.get(key);
    const r = rng(101 + n * 7);
    const out: Member[] = [];
    let off = 0;
    const count = (R.counts ?? [6, 13])[grand ? 1 : 0];
    const cells = bodies.cells;
    const pick = Array.from({ length: count }, () => Math.floor(r() * cells.length));
    for (let i = 0; i < count; i++) {
      out.push({ off, body: pick[i] });
      if (i === count - 1) break;
      // nose to tail, as they are painted — by each one's own length, so no two run into one shape;
      // the grand caravan in small knots of camels, with wider gaps between them
      const close = (cells[pick[i]].w + cells[pick[i + 1]].w) * 0.46;
      const air = grand ? (i % 4 === 3 ? 15 : 0.5) : 2;
      off += ((close + air + r() * 3) * road.unit) / (SPEED * road.unit ** DEPTH);
    }
    rosters.set(key, out);
    return out;
  }

  // The caravans on (or about to come onto) the road at `clock`. Number 0 is the painted one; it stands
  // while it is handed over, then sets off gently. Odd numbers are the grand ones.
  // The painted caravan's leader: its time on the road. It stands while it is handed over, then sets off gently.
  function firstAt() {
    const u = clock - FADE_IN;
    return road.lead0 + (u <= 0 ? 0 : u < SET_OFF ? (u * u) / (2 * SET_OFF) : u - SET_OFF / 2);
  }

  // How far along the road (in its own time) the painted caravan's leader is when number 1 sets out.
  const firstGap = () => road.gap1;

  function caravans() {
    const out: Team[] = [];
    const { Ttot } = road;
    const every = NEXT_AT * Ttot;
    const first = firstAt();
    const span = Ttot + 20 * road.gapT;
    if (first < span) out.push({ n: 0, t: first, grand: false });
    const c1 = first - firstGap(); // number 1's own time on the road (negative: still to come)
    const last = Math.floor((c1 + HERALD) / every);
    for (let j = Math.max(0, last - 2); j <= last; j++) {
      const t = c1 - j * every;
      if (t >= -HERALD && t < span) out.push({ n: j + 1, t, grand: (j + 1) % 2 === 1 });
    }
    return out;
  }

  function camelsOf(c: Team) {
    const list: Walker[] = [];
    const team = roster(c.n, c.grand);
    const handover = c.n === 0 ? smooth(0, FADE_IN, clock) : 1;
    team.forEach((m, i) => {
      const t = c.t - m.off;
      if (t < 0 || t > road.Ttot) return;
      const f = at(t);
      let [x, y, vis] = lerp(road.pts, f);
      // the painted camels start exactly where they are painted, and ease onto the road line
      let hold = 0; // 1 while the painted camels stand exactly as painted (same size, same place)
      if (c.n === 0 && m.at) {
        hold = 1 - smooth(0, 3, clock - FADE_IN);
        const r0 = lerp(road.pts, at(road.lead0 - m.off));
        x += (m.at[0] - r0[0]) * hold;
        y += (m.at[1] - r0[1]) * hold;
      }
      const s = lerp(road.scale, f) * (1 - hold) + hold * road.unit;
      const a = road.pts[Math.max(0, Math.floor(f) - 4)], b = road.pts[Math.min(road.n - 1, Math.floor(f) + 4)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const turn = dx / (Math.hypot(dx, dy) || 1);
      const face = turn >= 0 ? 1 : -1;
      const narrow = Math.max(0.3, Math.abs(turn)) * (1 - hold) + hold;
      // each camel in its own step (a smaller one a little quicker), by the time it has walked
      const quick = Math.sqrt(20 / bodies.cells[m.body].height);
      const legs = t * CADENCE * quick + (m.step ?? i * 0.37);
      // far off they cover more of their own length a second (DEPTH): a longer step, as far as a leg goes
      const reach = (REACH / quick) * Math.min(1.15, lerp(road.scale, f) ** (DEPTH - 1));
      const done = t / road.Ttot;
      let seen = gate < 0 || c.n === 0 ? 1 : smooth(gate, gate + 40, f);
      let edge = 1 - smooth(xMax - 40, xMax - 6, x);
      if (kind === 'tall') {
        // there the road goes out of sight over the crest of a dune, and comes back from behind another:
        // the camels sink behind it and rise again (they do not thin out in plain sight), and where the
        // words stand over the far end of the road, they are gone before they reach them
        seen *= vis;
        vis = vis > 0.01 ? 1 : 0;
        edge *= 1 - smooth(stopAt - 70, stopAt - 20, f);
      }
      const body = vis * edge * smooth(0.17, 0.32, s) * Math.min(1, seen * 1.4);
      const light = vis * edge * Math.min(1, seen * 2) * (1 - smooth(0.965, 1, done)) * handover;
      list.push({ i, t, f, x, y, s, face, narrow, legs, reach, hold, lamp0: m.lamp0, body, light, seen, grand: c.grand, cell: bodies.cells[m.body], c });
    });
    return list;
  }

  // How strongly the light of caravan c shows behind the ridge before it comes over, and where.
  function herald(c: Team) {
    if (c.n === 0 || kind === 'tall') return { a: 0, ix: 0 }; // (on the tall painting they walk in from the side: nothing to herald)
    const ahead = smooth(early - HERALD, early, c.t); // the light comes first, the camels after
    const comeT = road.T[gate > 0 ? Math.round(gate + 30) : road.rise + 30];
    const after = 1 - smooth(comeT, comeT + 16, c.t);
    const a = ahead * after * (c.grand ? 0.95 : 0.45); // a warm glow behind the ridge, not a white cloud
    return { a, ix: heraldAt };
  }

  // The light of each caravan, as soft footprints laid along the road (screen px): from under the
  // leader back over the caravan, and on along the road behind it, dimming. `a` is each one's
  // strength (0–1, already scaled by the caravan's gain / the largest gain).
  type Print = { x: number; y: number; rx: number; ry: number; a: number };
  function lightOf(c: Team, prints: Print[]) {
    const team = roster(c.n, c.grand);
    const B = c.grand ? BEAM.grand : BEAM.plain;
    const norm = B.gain / BEAM.grand.gain;
    const head = Math.min(c.t, road.Ttot); // the leader
    const tail = c.t - team[team.length - 1].off; // the last camel
    // the painted caravan lights up as it sets off, and lights none of the road behind where it stood
    const from = c.n === 0 ? road.lead0 - team[team.length - 1].off : 0;
    const start = c.n === 0 ? smooth(0, FADE_IN, clock) : 1; // with the patches: where the painted lanterns' glow was
    // at the city the whole band fades with the caravan into the city's lights
    const end = 1 - smooth(road.Ttot * 0.93, road.Ttot + 2, tail);
    const whole = start * end;
    if (whole < 0.01 || head <= 0) return;
    const dsImg = road.total / (road.n - 1);
    // how bright the road is, `behind` seconds after the last camel passed: brightest under them, cooling
    // over the two or three lengths behind (it is the caravan's own light that is seen to move), then a
    // faint band that sinks away over B.fade (no step anywhere)
    const left = (behind: number) => (behind <= 0 ? 1 : (1 - smooth(B.fade * 0.2, B.fade, behind)) * (0.3 + 0.7 * Math.exp(-((behind / 6) ** 2))));
    let f = at(head);
    while (f >= 0) {
      const t = lerp(road.T, f);
      const behind = tail - t;
      if (behind > B.fade || t < from - 0.5) break;
      const trail = left(behind);
      const s = lerp(road.scale, f);
      // a little wider where the caravan is than along the band behind it
      const rx = B.r * s * k * (0.6 + 0.4 * trail); // and narrower as it dims
      const p = lerp(road.pts, f);
      const step = Math.max(0.5, (0.45 * rx) / (dsImg * k)); // footprints about 0.45 of their width apart
      const vis = smooth(0.3, 0.95, p[2]);
      const seen = gate < 0 || c.n === 0 ? 1 : smooth(gate, gate + 40, f);
      let edge = 1 - smooth(xMax - 150, xMax - 10, p[0]); // a long fade: the band must not end in a cap at the edge
      if (kind === 'tall') edge *= 1 - smooth(stopAt - 90, stopAt - 25, f);
      const far = 0.55 + 0.45 * smooth(0.15, 0.75, s); // farther: narrower (rx) and fainter
      const fromHere = c.n === 0 ? smooth(from - 1, from + 1, t) : 1;
      // the leader's own footprint fades in over its first steps, so the band starts soft under it
      const lead = smooth(0, 1.5, head - t + 0.4);
      // (where they come into sight behind the words, the light comes up with their lanterns)
      const I = trail * lead * vis * Math.min(1, seen * 2) * edge * far * fromHere * whole;
      if (I > 0.004) {
        const [x, y] = map(p);
        // keep off the words: footprints fade out as they come up to them (only there: the rest of the
        // light stays), and nothing is ever drawn over the words themselves (offTheWords)
        // (on the tall painting, where the words are known frame by frame and stand a few px under the
        // ridge, a footprint stays until its middle reaches them: what of it would fall on the words is
        // cut away there, as everything is)
        const clear = (cy: number, ry: number) => (kind === 'tall' ? smooth(0, 4, toWords(x - rx * 0.3, cy - 1, x + rx * 0.3, cy + 1)) : smooth(2, 20, toWords(x - rx * 0.8, cy - ry * 0.8, x + rx * 0.8, cy + ry * 0.8)));
        // a footprint's cross-section integrates to about 0.62·rx; spaced `step` apart they sum to I
        const each = (norm * step * dsImg * k) / (0.62 * rx);
        const ry = rx * FLAT;
        const a = I * each * clear(y - ry * 0.1, ry);
        if (a > 0.002) prints.push({ x, y: y - ry * 0.1, rx, ry, a });
        // the pool with the caravan, on the slope
        // (not yet where they come over the ridge: the slope below the road there is the dark face of
        // the dune in front, which a pool of light turns pale)
        const pool = (behind <= 0 ? 1 : 1 - smooth(0, POOL.lasts, behind)) * smooth(road.rise + 90, road.rise + 220, f);
        if (pool > 0.01) {
          const py = rx * POOL.tall, cy = y + py * POOL.down;
          const b = I * pool * POOL.strength * each * clear(cy, py);
          if (b > 0.002) prints.push({ x, y: cy, rx, ry: py, a: b });
        }
      }
      f -= step;
    }
  }

  const prints: Print[] = [];
  // The lit sand is made once the pictures are in, when the browser is idle (at the latest 2 s after
  // asking) — never inside an animation frame, where it would hold the opening frames up. The caravan
  // waits for it (`ready`): its light is on the sand from its first moment. It is asked for only
  // from `step`, that is, only while the scene's frames run and the caravan is to walk: not with
  // reduced motion, not on phones, not where the words leave it no way.
  let litQueued = false;
  function litWhenIdle() {
    if (lit || litQueued) return;
    litQueued = true;
    const make = () => ((litQueued = false), litSand());
    if ('requestIdleCallback' in window) requestIdleCallback(make, { timeout: 2000 });
    else setTimeout(make, 200);
  }
  // where this frame's band of light lies in `scratch` (canvas px; null when there is none)
  let band: { X0: number; Y0: number; w: number; h: number; dpr: number } | null = null;
  function drawLight(ctx: CanvasRenderingContext2D) {
    band = null;
    prints.length = 0;
    for (const c of teams) lightOf(c, prints);
    if (!prints.length) return;
    const sand = lit;
    if (!sand) return;
    let X0 = 1e9, Y0 = 1e9, X1 = -1e9, Y1 = -1e9;
    for (const p of prints) (X0 = Math.min(X0, p.x - p.rx)), (Y0 = Math.min(Y0, p.y - p.ry)), (X1 = Math.max(X1, p.x + p.rx)), (Y1 = Math.max(Y1, p.y + p.ry));
    X0 = Math.floor(X0);
    Y0 = Math.floor(Y0);
    const dpr = ctx.getTransform().a || 1;
    const w = Math.ceil((X1 - X0 + 1) * dpr), h = Math.ceil((Y1 - Y0 + 1) * dpr);
    if (scratch.width < w || scratch.height < h) {
      scratch.width = Math.max(scratch.width, w);
      scratch.height = Math.max(scratch.height, h);
    }
    sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.globalCompositeOperation = 'source-over';
    sg.globalAlpha = 1;
    sg.clearRect(0, 0, w, h);
    sg.setTransform(dpr, 0, 0, dpr, -X0 * dpr, -Y0 * dpr);
    // the footprints add up into one smooth mask; where two bands cross it tops out at full, so
    // crossing bands are never brighter than the brightest one
    sg.globalCompositeOperation = 'lighter';
    for (const p of prints) {
      sg.globalAlpha = Math.min(1, p.a);
      sg.drawImage(pool, p.x - p.rx, p.y - p.ry, p.rx * 2, p.ry * 2);
    }
    // ... and keep the lit sand under it
    sg.globalAlpha = 1;
    sg.globalCompositeOperation = 'source-in';
    // (the sand that was kept reaches 120 px beyond the road to either side, 50 px above it and 70 px
    // below; no footprint reaches more than 58 px sideways, 28 px up or 58 px down from it — the pool
    // under a grand caravan at its largest — so the sand always covers the whole mask)
    const [sx, sy] = map([sand.x, sand.y]);
    sg.drawImage(sand.c, sx, sy, sand.c.width * k, sand.c.height * k);
    // laid over the painting (and the patches), as thick as the light is strong
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(scratch, 0, 0, w, h, X0, Y0, w / dpr, h / dpr);
    ctx.restore();
    band = { X0, Y0, w, h, dpr };
  }

  // The dune in front hides the road behind it, and the light on that road. But the piece of the
  // painting that does the hiding ends, on the right, in a line cut across open sand: the same slope
  // that, a little further right, lies under the road and is lit. Drawn plain, that line showed —
  // lit sand on one side of it, dark on the other. So while the band of light reaches it, the dune is
  // drawn lit as the slope beside it is: the same band laid over the dune's own pixels, less and less
  // toward the left, where the road sinks behind the crest (`lit` gives where that begins and where
  // it is full, in picture px). The crest stays the edge it is in the painting, the camels behind the
  // dune stay hidden, and the light keeps off the words as it does everywhere.
  // Returns false when the band does not reach the dune (it is then to be drawn as it is).
  const face = document.createElement('canvas');
  const fg = face.getContext('2d')!;
  function litDune(ctx: CanvasRenderingContext2D, o: (typeof R.occluders)[number]) {
    if (!band || !o.lit) return false;
    const { dpr } = band;
    const [ox, oy] = map([o.x, o.y]);
    const ow = o.w * k, oh = o.h * k;
    if (band.X0 >= ox + ow || band.X0 + band.w / dpr <= ox || band.Y0 >= oy + oh || band.Y0 + band.h / dpr <= oy) return false;
    // the dune, on whole canvas px
    const x0 = Math.floor(ox), y0 = Math.floor(oy);
    const w = Math.ceil((ox + ow - x0) * dpr), h = Math.ceil((oy + oh - y0) * dpr);
    if (face.width < w || face.height < h) {
      face.width = Math.max(face.width, w);
      face.height = Math.max(face.height, h);
    }
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalCompositeOperation = 'source-over';
    fg.globalAlpha = 1;
    fg.clearRect(0, 0, face.width, face.height);
    fg.save();
    fg.setTransform(dpr, 0, 0, dpr, -x0 * dpr, -y0 * dpr);
    // (all of it inside the dune's own picture, which the last step below covers whole)
    fg.beginPath();
    fg.rect(ox, oy, ow, oh);
    fg.clip();
    // the band of light ...
    fg.drawImage(scratch, 0, 0, band.w, band.h, band.X0, band.Y0, band.w / dpr, band.h / dpr);
    // ... thinned out toward the left ...
    const [g0] = map([o.lit[0], 0]), [g1] = map([o.lit[1], 0]);
    const ramp = fg.createLinearGradient(g0, 0, g1, 0);
    for (let i = 0; i <= 8; i++) ramp.addColorStop(i / 8, `rgba(0, 0, 0, ${smooth(0, 1, i / 8)})`);
    fg.globalCompositeOperation = 'destination-in';
    fg.fillStyle = ramp;
    fg.fillRect(ox - 1, oy - 1, ow + 2, oh + 2);
    // ... none of it over the words ...
    fg.globalCompositeOperation = 'destination-out';
    fg.fillStyle = '#000';
    for (const [a0, b0, a1, b1] of text) fg.fillRect(a0 - 4, b0 - 4, a1 - a0 + 8, b1 - b0 + 8);
    // ... and under it the dune itself, which gives the whole its shape
    fg.globalCompositeOperation = 'destination-atop';
    fg.drawImage(img(o.src), ox, oy, ow, oh);
    fg.restore();
    ctx.drawImage(face, 0, 0, w, h, x0, y0, w / dpr, h / dpr);
    return true;
  }

  let scene: Walker[] = [];
  let teams: Team[] = [];
  let motes: Mote[] = [];
  const rand = rng(11);

  // Screen transform for a camel: origin at its feet, image px at its size.
  function place(ctx: CanvasRenderingContext2D, m: Walker) {
    const [sx, sy] = map([m.x, m.y]);
    const kk = m.s * k;
    // rising from behind the ridge where it comes into sight (the stretch before is under text)
    const rise = (1 - m.seen) * m.cell.height * 0.9;
    ctx.translate(sx, sy);
    return { kk, rise };
  }

  // How high the body rides at phase `ph`: a little higher as each side's legs pass upright under it.
  const bobAt = (ph: number) => -0.28 * Math.cos(4 * Math.PI * (ph - DUTY / 2));

  function drawCamel(ctx: CanvasRenderingContext2D, m: Walker) {
    const cell = m.cell;
    const { kk, rise } = place(ctx, m);
    if (rise > 0.05) {
      ctx.beginPath();
      ctx.rect(-60 * kk, -80 * kk, 120 * kk, 80 * kk + 0.5); // only above the ground line
      ctx.clip();
    }
    ctx.scale(m.face * m.narrow * kk, kk);
    ctx.translate(0, rise);
    const ph = ((m.legs % 1) + 1) % 1;
    // body box, relative to the feet
    const bx = -cell.foot[0], by = -cell.foot[1] + bobAt(ph);
    const belly = by + cell.belly;
    const long = cell.foot[1] - cell.belly; // the leg that shows under the belly
    // A leg swings from high inside the body (the body hides that part), so under the belly it
    // only leans a little; it is straight while it carries, and folds at the knee as it is brought forward.
    const pivot = belly - 0.75 * long;
    const lift = 0.15 * long;
    const limb = (at: number, u: number, fore: boolean, far: boolean) => {
      const [fx, fy, fold] = footAt(u, m.reach, lift);
      const thin = far ? 0.86 : 1;
      const px = bx + at;
      const tx = px + fx, ty = fy - (far ? 0.55 : 0); // the far side treads a little higher on the picture
      // the knee (fore) or hock (hind): on the leg's line, pushed forward or back as it folds
      const jy = ty - (fore ? 0.5 : 0.54) * long;
      const jx = px + ((tx - px) * (jy - pivot)) / (ty - pivot) + (fore ? 0.12 + 1.35 * fold : -(0.42 + 1.15 * fold));
      const y0 = belly - 0.8; // up inside the body
      const x0 = px + ((jx - px) * (y0 - pivot)) / (jy - pivot);
      const ay = ty - 0.4;
      const w0 = (fore ? 1.9 : 2.5) * thin, w1 = (fore ? 1.25 : 1.38) * thin, w2 = 0.95 * thin;
      // a tapering strip: thigh, joint, shank
      const n0 = Math.hypot(jx - x0, jy - y0) || 1, n1 = Math.hypot(tx - jx, ay - jy) || 1;
      const ax = (jy - y0) / n0, bxn = (ay - jy) / n1; // the direction across each part (x, then y)
      const ayn = -(jx - x0) / n0, byn = -(tx - jx) / n1;
      const mx = (ax + bxn) / 2, my = (ayn + byn) / 2;
      ctx.beginPath();
      ctx.moveTo(x0 - (ax * w0) / 2, y0 - (ayn * w0) / 2);
      ctx.lineTo(jx - (mx * w1) / 2, jy - (my * w1) / 2);
      ctx.lineTo(tx - (bxn * w2) / 2, ay - (byn * w2) / 2);
      ctx.lineTo(tx + (bxn * w2) / 2, ay + (byn * w2) / 2);
      ctx.lineTo(jx + (mx * w1) / 2, jy + (my * w1) / 2);
      ctx.lineTo(x0 + (ax * w0) / 2, y0 + (ayn * w0) / 2);
      ctx.closePath();
      ctx.fill();
      // rounded where it meets the body (a haunch, where the body's own outline curves away above it)
      ctx.beginPath();
      ctx.arc(x0, y0, w0 / 2, 0, Math.PI * 2);
      ctx.fill();
      // the broad foot, toe forward
      ctx.beginPath();
      ctx.ellipse(tx + 0.3, ty - 0.36, 0.95 * thin, 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    // the far side's legs first, a shade lighter (the road's glow is behind them), half a stride later;
    // the fore foot follows the hind foot of its side by a tenth of a stride
    const [r, g, b] = cell.leg;
    ctx.fillStyle = `rgb(${Math.round(r + (112 - r) * 0.3)}, ${Math.round(g + (50 - g) * 0.3)}, ${Math.round(b + (40 - b) * 0.3)})`;
    limb(cell.hip + 0.5, (ph + 0.5) % 1, false, true);
    limb(cell.shoulder + 0.5, (ph + 0.4) % 1, true, true);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    limb(cell.hip, ph, false, false);
    limb(cell.shoulder, (ph + 0.9) % 1, true, false);
    // (the bodies are stored `res` times their size in the painting, so they stay smooth seen large)
    const res = bodies.res;
    ctx.drawImage(img('bodies.webp'), cell.x * res, 0, cell.w * res, cell.h * res, bx, by, cell.w, cell.h);
  }

  function lanternOf(m: Walker): Pt {
    const [sx, sy] = map([m.x, m.y]);
    const kk = m.s * k;
    const cell = m.cell;
    // carried over the neck, a little above the load; the painted caravan's start where they are painted
    // (two of them hang low there) and are lifted into place as it sets off
    const L = m.hold > 0 ? mix(cell.lantern, m.lamp0 ?? cell.lanternAt, m.hold) : cell.lantern;
    const ph = ((m.legs % 1) + 1) % 1;
    // it hangs: a slow swing, once a stride
    const sway = 0.3 * Math.sin((m.legs + 0.15) * Math.PI * 2 + m.i);
    const rise = (1 - m.seen) * cell.height * 0.9;
    return [sx + m.face * m.narrow * (L[0] - cell.foot[0] + sway) * kk, sy + (L[1] - cell.foot[1] + rise + bobAt(ph)) * kk];
  }

  // A ribbon of silk from one camel's load, streaming back along the way they came and up toward the
  // sky. Sheer: a faint fill, brighter edges, a sheen where it turns edge-on.
  // One long ribbon of silk, as if the caravan led a strand of the sky's ribbon along.
  // It follows where its camel was over the last `lag` seconds (smoothed hard), lifted into the wind,
  // so at a hairpin the root turns first and the tail swings round seconds later, never kinking.
  // opts: lag (s), len (in camel heights, roughly), lift, seed, rows (silk threads), N (segments)
  function ribbon(ctx: CanvasRenderingContext2D, m: Walker, opts: { lag: number; lift: number; seed: number; N: number }, clockSky: number) {
    const { lag, lift: liftH, seed, N } = opts;
    const fade = Math.min(m.body, m.light) * smooth(road.gapT * 2, road.gapT * 4.5, m.t);
    if (fade < 0.03) return;
    const kk = m.s * k;
    const h = m.cell.height * kk; // one camel's height on screen
    const top = m.cell.height * 0.95 * kk;
    const raw: Pt[] = [];
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      raw.push(map(lerp(road.pts, at(m.t - v * lag))));
    }
    // heavy smoothing, widening toward the tail (the tail has the most inertia)
    const base = raw.map((_, j) => {
      const r = Math.round(2 + (j / N) * N * 0.22);
      let x = 0, y = 0, n = 0;
      for (let q = Math.max(0, j - r); q <= Math.min(N, j + r); q++) (x += raw[q][0]), (y += raw[q][1]), n++;
      return [x / n, y / n];
    });
    const off = [raw[0][0] - base[0][0], raw[0][1] - base[0][1]];
    const mid: Pt[] = [];
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const keep = 1 - smooth(0, 0.3, v);
      const up = top + liftH * h * (0.55 * (1 - (1 - v) ** 2) + 0.45 * v * v); // rises off the load, streams back, lifts again toward the sky
      mid.push([base[j][0] + off[0] * keep, base[j][1] + off[1] * keep - up]);
    }
    // a wave travelling from root to tail, largest at the tail, across the ribbon's own direction
    const nrm0 = mid.map((_, j) => {
      const a = mid[Math.max(0, j - 2)], b = mid[Math.min(N, j + 2)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    });
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const w = Math.sin(clockSky * 1.3 - v * 7 + seed) * (0.08 + 0.9 * v * v) * h + Math.sin(clockSky * 0.6 - v * 3 + seed * 1.7) * 0.4 * v * h;
      mid[j] = [mid[j][0] + nrm0[j][0] * w, mid[j][1] + nrm0[j][1] * w];
    }
    // never over the words: the whole strand dims as any part of it comes near them
    let near = 1e9;
    for (const [x, y] of mid)
      for (const [x0, y0, x1, y1] of text) near = Math.min(near, Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)));
    const clear = smooth(6, 30, near - h * 0.6);
    if (clear < 0.02) return;
    const fadeAll = fade * clear;
    const nrm = mid.map((_, j) => {
      const a = mid[Math.max(0, j - 1)], b = mid[Math.min(N, j + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    });
    // width: widest in the middle, a little at the root, tapering to a fine tail; one or two slow turns
    const wid: number[] = [], face: number[] = [];
    for (let j = 0; j <= N; j++) {
      const v = j / N;
      const prof = 0.18 + 0.82 * Math.sin(Math.PI * Math.min(1, (v * 0.95) ** 0.75)) * (1 - 0.6 * smooth(0.6, 1, v));
      const twist = Math.cos(Math.PI * 1.6 * v - clockSky * 0.45 + seed);
      face.push(twist); // signed: which side faces us
      wid.push(h * 1.05 * prof * (0.22 + 0.78 * Math.abs(twist)));
    }
    const edge = (sgn: number, f = 0.5): Pt[] => mid.map((p, j) => [p[0] + sgn * nrm[j][0] * wid[j] * f, p[1] + sgn * nrm[j][1] * wid[j] * f]);
    const A = edge(1), B = edge(-1);
    const col = (v: number) => (v < 0.5 ? mix([255, 92, 132], [255, 172, 72], v / 0.5) : v < 0.82 ? mix([255, 172, 72], [255, 130, 112], (v - 0.5) / 0.32) : mix([255, 130, 112], [70, 220, 200], (v - 0.82) / 0.18));
    const end = (v: number) => smooth(0, 0.04, v) * (1 - smooth(0.82, 1, v));
    // the sheer body: brighter where it turns toward edge-on, with a faint unevenness along its length
    for (let j = 0; j < N; j++) {
      const v = (j + 0.5) / N;
      const turn = 1 - (Math.abs(face[j]) + Math.abs(face[j + 1])) / 2;
      const grain = 0.88 + 0.12 * Math.sin(v * 61 + seed * 3) * Math.sin(v * 23 + 1);
      ctx.globalAlpha = fadeAll * end(v) * grain * (0.42 + 0.5 * turn);
      ctx.fillStyle = `rgb(${col(v).map(Math.round).join(',')})`;
      ctx.beginPath();
      ctx.moveTo(A[j][0], A[j][1]);
      ctx.lineTo(A[j + 1][0], A[j + 1][1]);
      ctx.lineTo(B[j + 1][0], B[j + 1][1]);
      ctx.lineTo(B[j][0], B[j][1]);
      ctx.closePath();
      ctx.fill();
    }
    const along = (alphaAt: (v: number) => number, colAt: (v: number) => number[], width: number, pts: Pt[]) => {
      const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[N][0], pts[N][1]);
      for (const v of [0, 0.15, 0.35, 0.5, 0.65, 0.82, 0.92, 1]) g.addColorStop(v, `rgba(${colAt(v).map(Math.round).join(',')}, ${clamp(alphaAt(v), 0, 1)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
    };
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = fadeAll;
    // fine silk threads running along it (very faint)
    for (const f of [-0.22, 0.18]) along((v) => 0.1 * end(v), (v) => mix(col(v), [255, 230, 200], 0.3), Math.max(0.4, 0.035 * h), edge(1, f));
    // bright hems
    for (const e of [A, B]) along((v) => 0.9 * end(v), (v) => mix(col(v), [255, 225, 180], 0.15), Math.max(0.6, 0.08 * h), e);
    // the sheen where it turns
    ctx.lineWidth = Math.max(0.8, 0.14 * h);
    for (let j = 0; j < N; j++) {
      const v = (j + 0.5) / N;
      const sh = (1 - Math.abs(face[j])) ** 3;
      if (sh < 0.05) continue;
      ctx.globalAlpha = fadeAll * end(v) * 0.75 * sh;
      ctx.strokeStyle = `rgb(${mix(col(v), [255, 232, 196], 0.4).map(Math.round).join(',')})`;
      ctx.beginPath();
      ctx.moveTo(mid[j][0], mid[j][1]);
      ctx.lineTo(mid[j + 1][0], mid[j + 1][1]);
      ctx.stroke();
    }
    // a few steady motes off the frayed tail
    for (let q = 0; q < 4; q++) {
      const v = 0.86 + q * 0.035;
      const j = Math.min(N, Math.round(v * N));
      const o = (q % 2 ? 1 : -1) * (wid[j] * 0.6 + (q + 1) * 0.12 * h);
      const p = [mid[j][0] + nrm[j][0] * o, mid[j][1] + nrm[j][1] * o];
      const r = Math.max(1, 0.12 * h);
      ctx.globalAlpha = fadeAll * 0.55 * (1 - q / 4);
      ctx.drawImage(ember, p[0] - r, p[1] - r, r * 2, r * 2);
    }
  }

  // How far a point (or a box) is from the nearest word, in canvas px.
  function toWords(x0: number, y0: number, x1 = x0, y1 = y0) {
    let d = 1e9;
    for (const [a0, b0, a1, b1] of text) d = Math.min(d, Math.hypot(Math.max(a0 - x1, 0, x0 - a1), Math.max(b0 - y1, 0, y0 - b1)));
    return d;
  }

  // Nothing of the caravan is ever drawn over the words: everything after the patches is clipped to
  // outside each word's box (with a little air). One clip per box: each keeps the outside of its box.
  function offTheWords(ctx: CanvasRenderingContext2D) {
    const air = kind === 'tall' ? 1 : 4;
    const W = ctx.canvas.width, H = ctx.canvas.height; // generous: the context is scaled by dpr already
    for (const [x0, y0, x1, y1] of text) {
      ctx.beginPath();
      ctx.rect(-W, -H, 3 * W, 3 * H);
      ctx.rect(x0 - air, y0 - air, x1 - x0 + 2 * air, y1 - y0 + 2 * air);
      ctx.clip('evenodd');
    }
  }

  return {
    get active() {
      return on && ready();
    },
    get state() {
      const r = road && { Ttot: road.Ttot, lead0: road.lead0, every: NEXT_AT * road.Ttot, second: SECOND_AT, xMax, firstArrives: FADE_IN + SET_OFF / 2 + road.Ttot - road.lead0 };
      // (only asked when it walks: asking loads the pictures)
      return { on, ready: on && ready(), kind, why, gate, rear: rearAt, ...r };
    },
    // where the drawn camels are now (image px), for checks
    get scene() {
      return scene.map((m) => [+m.x.toFixed(2), +m.y.toFixed(2)]);
    },
    get clock() {
      return clock;
    },
    get length() {
      return road ? road.Ttot : 0;
    },
    /** (The tall painting, every frame:) where the words are on the canvas at this moment. */
    words(rects: Rect[]) {
      text = rects;
    },
    /**
     * Call whenever the canvas is laid out, and whenever the words move. `avoid`: rects [x0, y0, x1, y1]
     * of the words, in canvas px (over the drift's whole sweep; a fifth and sixth number, where given,
     * are y0 and y1 with the words at their lowest on the canvas). `rightEdge`: the right edge of what is seen of the canvas at the
     * drift's widest (canvas px). `painting`: the <img> of the picture (the light is made from its sand).
     * Only the layout changes: the caravans walk on where they are.
     */
    setup(which: Kind, mapFn: (p: Pt) => Pt, scale: number, avoid: Rect[] = [], rightEdge: number | null = null, painting: HTMLImageElement | null = null) {
      // the painting itself (its sand is what the caravans' light brightens)
      if (painting && painting !== art) (art = painting), (lit = null);
      if (which !== kind || !road) {
        kind = which;
        R = route[kind];
        road = build(R);
        rosters.clear();
      }
      map = mapFn;
      k = scale;
      text = avoid;
      const [ox] = map([0, 0]);
      xMax = rightEdge == null ? 1e9 : (rightEdge - ox) / k;
      // (on the tall painting the caravan walks in a gap between two lines of words, a few px from
      // each, and the words are measured as their ink: no air is asked for there — nothing is ever
      // drawn over them in any case, see offTheWords)
      const tall = which === 'tall';
      const hw = 0.7 * R.size * k, up = 1.4 * R.size * k, air = tall ? 0 : 6;
      why = null;
      let last = -1;
      const lead = Math.floor(at(road.lead0));
      // (on the tall painting a camel's box is as large as the camel is there — the far road runs close
      // under the wordmark, where they are a few px tall — and only the far road is asked about here:
      // see below)
      let after = -1;
      road.pts.forEach(([x, y, v], i) => {
        if (i % 3 || v < 0.05 || (tall && i <= road.sinks)) return;
        const [sx, sy] = map([x, y]);
        const z = tall ? road.scale[i] / road.unit : 1;
        const hit = avoid.find(([x0, y0, x1, y1]) => sx + hw * z > x0 - air && sx - hw * z < x1 + air && sy + 2 > y0 - air && sy - up * z < y1 + air);
        if (hit) {
          last = i;
          if (after < 0) after = i;
          if (!tall) why = { at: [Math.round(sx), Math.round(sy)], text: hit.map(Math.round) };
        }
      });
      // Where the words come near the road only up to where the painted caravan already stands (its
      // leader), new caravans come into sight after that point (from behind the ridge); past it, it
      // stays as painted.
      rearAt = lead;
      on = last <= lead;
      stopAt = road.n;
      if (tall) {
        // On the tall painting (phones, tablets held upright) the page hangs the picture from the
        // words: the ridge the camels walk lies in the gap between the wordmark and the first line,
        // with a few px to spare above and below (Page.astro, the scene). So the walk is not asked
        // to go round anything there. Should a camel or its light still reach a line of words at
        // some moment (the words are known frame by frame: `words`), that part of it is not drawn:
        // it passes behind the line as behind a wall, never over or under a letter. And it stays as
        // painted where, with the words at their lowest, half or more of the painted caravan would
        // be hidden (no size the page lays out itself: a guard). On the far road the words (the
        // wordmark, over the city) end the walk early: `stopAt`.
        const rear = Math.floor(at(road.lead0 - road.first[road.first.length - 1].off));
        let hid = 0, all = 0;
        for (let i = rear; i <= lead; i += 3) {
          const [sx, sy] = map(road.pts[i]);
          const h = 20 * road.scale[i] * k; // a camel's height there, on the canvas
          const over = avoid.find((q) => sx > q[0] && sx < q[2] && sy - 0.5 * h > (q[4] ?? q[1]) && sy - h < (q[5] ?? q[3]));
          all++;
          if (over) (hid++), (why = { at: [Math.round(sx), Math.round(sy)], text: over.slice(0, 4).map(Math.round) });
        }
        on = hid < all * 0.5;
        if (on) why = null;
        if (after > 0) stopAt = after;
        last = -1;
      }
      gate = last < 0 ? -1 : Math.max(road.rise, last + 6);
      const underWay = firstAt() - firstGap() + HERALD > early; // number 1's light already showing
      // the light's centre: from just past where they come into sight, on along the road until its
      // glow (about 90 × 36 of the picture's px around it) keeps clear of the words
      heraldAt = Math.min(road.n - 1, gate > 0 ? gate + 40 : road.rise + 70);
      for (let j = heraldAt; j < Math.min(road.n - 1, heraldAt + 200); j += 4) {
        const [x, y] = map(road.pts[j]);
        const q = road.scale[j] * k;
        if (toWords(x - 85 * q, y - 34 * q, x + 85 * q, y + 22 * q) > 6) {
          heraldAt = j;
          break;
        }
      }
      if (!underWay) early = gate > road.rise ? road.T[gate] - road.T[road.rise] : 0;
      return on;
    },
    step(dt: number) {
      if (!on || !arrived()) return;
      if (lit && litOf !== picture()) lit = null; // (made from another picture than the one now shown)
      if (!lit) return litWhenIdle();
      clock += dt;
      teams = caravans();
      scene = [];
      for (const c of teams) if (c.t >= 0) scene.push(...camelsOf(c));
      scene.sort((a, b) => a.y - b.y);
      // sparks of lantern light drifting up from behind the ridge before the grand caravan comes
      for (const c of teams) {
        if (!c.grand) continue;
        const { a, ix } = herald(c);
        if (a < 0.05 || rand() > dt * 8 * Math.min(1, a)) continue;
        const j = clamp(Math.round(ix + (rand() - 0.3) * 120), Math.max(road.rise, gate), road.n - 1);
        const [px, py] = map(road.pts[j]);
        const q = road.scale[j] * k;
        motes.push({ x: px + (rand() - 0.5) * 6 * q, y: py - rand() * 3 * q, vx: (rand() - 0.3) * 3 * q, vy: -(6 + rand() * 8) * q, life: 0, max: 2.4 + rand() * 1.8, r: 0.7 * (0.8 + rand() * 0.7) * Math.max(0.9, q), a: Math.min(1, a), rise: true });
      }
      for (const m of scene) {
        if (!m.grand || m.body < 0.3) continue;
        const [sx, sy] = map([m.x, m.y]);
        const kk = m.s * k;
        // gold sand lit by the lanterns, kicked up at their feet
        if (rand() < dt * 3.5) motes.push({ x: sx + (rand() - 0.5) * 8 * kk, y: sy - rand() * 2 * kk, vx: -m.face * (3 + rand() * 4) * kk, vy: -(1.5 + rand() * 3) * kk, life: 0, max: 1.4 + rand(), r: (0.5 + rand() * 0.5) * Math.max(0.7, kk), a: 0.4 * m.body });
      }
      for (const p of motes) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.rise ? -0.6 : 1.2) * dt * k;
      }
      motes = motes.filter((p) => p.life < p.max).slice(-200);
    },
    drawGround(ctx: CanvasRenderingContext2D) {
      if (!this.active) return;
      // the painted caravan (and the far little figures on the road), hidden under patches of sand
      const fade = smooth(0, FADE_IN, clock);
      ctx.globalAlpha = fade;
      patches[kind].forEach((P, i) => {
        const [px, py] = map([P.x, P.y]);
        ctx.drawImage(img(patchSrc[kind][i]), px, py, P.w * k, P.h * k);
      });
      ctx.save();
      offTheWords(ctx);
      ctx.globalAlpha = 1;
      // the light that goes with each caravan, on the sand (under everything else of theirs, behind the dune in front)
      drawLight(ctx);
      // light coming over the ridge before a caravan does (behind the dune in front, which is drawn after)
      for (const c of teams) {
        const { a, ix } = herald(c);
        if (a < 0.01) continue;
        const [x, y] = map(road.pts[Math.min(road.n - 1, ix)]);
        const kk = road.scale[ix] * k;
        // only above the ridge line: the light is behind it
        ctx.save();
        ctx.beginPath();
        const lo = Math.max(road.rise, gate, ix - 160), hi = Math.min(road.n - 1, ix + 160);
        const [ex, ey] = map(road.pts[hi]), [sx0, sy0] = map(road.pts[lo]);
        const [sx1, sy1] = map(road.pts[lo + 30]);
        const slope = (sy1 - sy0) / (sx1 - sx0 || 1);
        // run on past both ends along the ridge, so the glow fades out on its own
        ctx.moveTo(sx0 - 400 * kk, sy0 + 1 - slope * 400 * kk);
        for (let j = lo; j <= hi; j += 4) {
          const [px, py] = map(road.pts[j]);
          ctx.lineTo(px, py + 1);
        }
        ctx.lineTo(ex + 400 * kk, ey + 1);
        ctx.lineTo(ex + 400 * kk, ey - 300 * kk);
        ctx.lineTo(sx0 - 400 * kk, sy0 - 300 * kk);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = a;
        ctx.drawImage(haze, x - 100 * kk, y - 40 * kk, 200 * kk, 66 * kk);
        ctx.globalAlpha = a * 0.9;
        ctx.drawImage(heart, x - 52 * kk, y - 17 * kk, 104 * kk, 30 * kk);
        ctx.restore();
        // and the crest of the ridge catches the light, brightest where they will come over
        for (let j = lo; j <= Math.min(road.n - 1, ix + 140); j += 3) {
          const [px, py] = map(road.pts[j]);
          const q = road.scale[j] * k;
          const w = Math.exp(-(((j - ix) / 100) ** 2));
          ctx.globalAlpha = Math.min(1, a * 0.3 * w);
          ctx.drawImage(glow, px - 7 * q, py - 2.8 * q, 14 * q, 5.6 * q);
        }
        // the ridge's outline picked out in a thin line of gold, against the light behind it
        ctx.lineCap = 'round';
        for (let j = lo; j < Math.min(road.n - 1, ix + 160); j += 2) {
          const w = Math.exp(-(((j - ix) / 110) ** 2));
          if (w < 0.03) continue;
          const [p0x, p0y] = map(road.pts[j]), [p1x, p1y] = map(road.pts[j + 2]);
          const q = road.scale[j] * k;
          ctx.globalAlpha = Math.min(1, a * w);
          ctx.strokeStyle = 'rgb(255, 208, 136)';
          ctx.lineWidth = Math.max(1.2, 1.5 * q);
          ctx.beginPath();
          ctx.moveTo(p0x, p0y - 0.6 * q);
          ctx.lineTo(p1x, p1y - 0.6 * q);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // each lantern's own pool on the ground at its camel's feet — under the camels, so their legs
      // stand dark against it (laid over them, it washed the legs out)
      for (const m of scene) {
        if (m.body <= 0.05) continue;
        const [sx, sy] = map([m.x, m.y]);
        const kk = m.s * k;
        const pw = 18 * kk, ph = 5 * kk;
        ctx.globalAlpha = (m.grand ? 0.38 : 0.3) * m.body * Math.min(1, m.light * 1.5);
        ctx.drawImage(glow, sx - pw, sy - ph, pw * 2, ph * 2);
      }
      for (const m of scene) {
        if (m.body <= 0.01) continue;
        ctx.globalAlpha = m.body * (0.75 + 0.25 * smooth(0.3, 0.9, m.s));
        ctx.save();
        drawCamel(ctx, m);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // the dune in front of the road (a piece of the painting itself, so never clipped), fading
      // in with the patches
      ctx.globalAlpha = fade;
      R.occluders.forEach((o) => {
        // (lit at its near end while a caravan's light reaches it)
        if (litDune(ctx, o)) return;
        const [ox, oy] = map([o.x, o.y]);
        ctx.drawImage(img(o.src), ox, oy, o.w * k, o.h * k);
      });
      // and nothing of this leaks into what the sky draws next
      ctx.globalAlpha = 1;
    },
    drawLights(ctx: CanvasRenderingContext2D, clockSky: number) {
      if (!this.active) return;
      ctx.save();
      offTheWords(ctx);
      ctx.globalCompositeOperation = 'source-over'; // (the sky draws its own lights added; see the top of this file)
      for (const m of scene) {
        if (m.light <= 0.01) continue;
        const [lx, ly] = lanternOf(m);
        const flick = 0.85 + 0.15 * Math.sin(clockSky * 5 + m.i * 1.7) * Math.sin(clockSky * 1.9 + m.i);
        const big = m.grand ? 1.25 : 1;
        const kk = m.s * k;
        const a = clamp(m.light * flick, 0, 1);
        const halo = Math.max(2.4, 5.5 * kk) * big; // as large as the painted lanterns' glow
        ctx.globalAlpha = a * (m.grand ? 0.95 : 0.85);
        ctx.drawImage(lamp, lx - halo, ly - halo, halo * 2, halo * 2);
        const core = Math.max(1.2, 1.9 * kk) * big;
        ctx.globalAlpha = a * (m.grand ? 0.65 : 0.55);
        ctx.drawImage(glow, lx - core, ly - core, core * 2, core * 2);
        const flame = Math.max(0.8, 1.05 * kk) * big;
        ctx.globalAlpha = a * 0.8;
        ctx.drawImage(wick, lx - flame, ly - flame, flame * 2, flame * 2);
      }
      for (const p of motes) {
        const a = p.a * Math.sin(Math.PI * (p.life / p.max)) * smooth(4, 24, toWords(p.x, p.y)); // fade before the words, no hard edge
        if (a <= 0.01) continue;
        ctx.globalAlpha = clamp(a, 0, 1);
        const r = p.r * 2.2;
        ctx.drawImage(p.rise ? spark : ember, p.x - r, p.y - r, r * 2, r * 2);
      }
      // silk: one long strand from the leader's load, streaming back over the whole caravan (a second,
      // shorter one was tried and dropped: one strand reads as a gesture, two as shapes)
      for (const m of scene) {
        if (!m.grand) continue;
        if (m.i === 0 && kind === 'wide') ribbon(ctx, m, { lag: 16.6, lift: 4.5, seed: m.c.n, N: 56 }, clockSky);
      }
      ctx.restore();
    },
  };
}
