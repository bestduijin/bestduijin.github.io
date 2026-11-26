// The caravan in the opening painting walks: along the golden road to the city on the horizon,
// and when it is well on its way, a grander one comes over the ridge behind it — its light first,
// then the camels, with a strand of silk streaming over them; and so on, for ever.
//
// Everything is in the painting's own pixels (public/hero/hero_{wide,tall}.webp) and is mapped onto
// the canvas the way CSS `object-fit: cover` places the picture (sky.ts passes the mapping in). It
// draws on the sky's canvas, inside the sky's own animation frame:
//   drawGround(ctx) — the patches that hide the painted caravan, the camels, the dune in front;
//   drawLights(ctx) — additive, with the sky's other lights: lanterns, the road's afterglow, dust, silk.
// The camels' bodies are cut from the painting itself; only their legs are drawn, stepping in a
// camel's pace. Until its pictures have loaded, or where the road would run under the text, it stays
// off and the painted caravan is left as it is (`active` is false).
//
// The data (src/scripts/caravan/*.json) and pictures (public/hero/caravan/) are made by the scripts in
// B003/个人主页_插画/驼队动画/ (make_patch.py, make_route.py, make_bodies.py): change the paintings,
// re-run them.

import ROUTE from './caravan/route.json';
import BODIES from './caravan/bodies.json';
import PATCH from './caravan/patch.json';

type Pt = number[];
type Rect = [number, number, number, number];
type Cell = (typeof BODIES.cells)[number];
type Kind = 'wide' | 'tall';
const BASE = '/hero/caravan/';

type Road = { pts: Pt[]; scale: number[]; T: number[]; D: number[]; n: number; total: number; Ttot: number; lead0: number; gapT: number; first: Member[]; rise: number };
type Member = { off: number; body: number; at?: number[] };
type Team = { n: number; t: number; grand: boolean };
type Walker = { i: number; t: number; f: number; x: number; y: number; s: number; face: number; narrow: number; legs: number; body: number; light: number; seen: number; grand: boolean; cell: Cell; c: Team };
type Mote = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; a: number; rise?: boolean };

const SPEED = 24; // image px per second for a camel at full size (scale 1)
const DEPTH = 0.3; // farther camels go slower on screen, by scale^DEPTH (less than in proportion: the far road would drag)
const HIDDEN_RUSH = 3; // out of sight (behind a dune), they walk this many times faster
const NEXT_AT = 0.72; // the next caravan sets out when this one's leader has done this share of its time on the road
const FADE_IN = 0.8; // seconds: the painted caravan hands over to the drawn one
const SET_OFF = 2.0; // seconds: from standing to full speed
const HERALD = 5; // seconds of warm light behind the ridge before a caravan comes over it
const STEP = 0.9; // gait cycles per full-size body length walked
const WARM = '255, 172, 92';
const GOLD = '255, 206, 140';

// Catmull–Rom spline through [x, y, visibility] points, sampled evenly by length.
function trace(pts: Pt[], n: number) {
  const raw: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 30; k++) {
      const t = k / 30, t2 = t * t, t3 = t2 * t;
      raw.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
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
    out.push([0, 1, 2].map((k) => raw[j][k] + (raw[j + 1][k] - raw[j][k]) * u));
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

// Where a foot is, relative to its hip, at gait phase u: on the ground pushing back for 62% of the
// cycle, then lifted and swung forward.
function footAt(u: number, stride: number, lift: number): Pt {
  const duty = 0.62;
  if (u < duty) return [stride / 2 - stride * (u / duty), 0];
  const v = (u - duty) / (1 - duty);
  return [-stride / 2 + stride * (0.5 - 0.5 * Math.cos(Math.PI * v)), -lift * Math.sin(Math.PI * v)];
}

// Two-bone leg: the knee, given hip and foot. Forelegs bend forward at the knee, hind legs back.
function knee(hx: number, hy: number, fx: number, fy: number, l1: number, l2: number, forward: boolean): Pt {
  const dx = fx - hx, dy = fy - hy;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const g = forward ? a - b : a + b;
  return [hx + l1 * Math.cos(g), hy + l1 * Math.sin(g)];
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
  const route = ROUTE as Record<Kind, { horizon: number; near: number; size: number; pts: Pt[]; occluders: { src: string; x: number; y: number; w: number; h: number }[] }>;
  const bodies = BODIES;
  // The pictures load only once a layout lets the caravan walk (never on phones, where it does not).
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
  const patches = { wide: [PATCH.wide, PATCH.wide_road], tall: [PATCH.tall] };
  const patchSrc = { wide: ['patch_wide.webp', 'patch_wide_road.webp'], tall: ['patch_tall.webp'] };
  const pics = () => [img('bodies.webp'), ...patchSrc[kind].map(img), ...route[kind].occluders.map((o) => img(o.src))];
  const ready = () => pics().every((i) => i.complete && i.naturalWidth > 0);

  const glow = soft(WARM, [[0, 1], [0.15, 0.7], [0.4, 0.25], [0.7, 0.06], [1, 0]]);
  const lamp = soft('255, 118, 40', [[0, 0.9], [0.3, 0.55], [0.65, 0.15], [1, 0]]); // the painted lanterns are orange, not white
  const ember = soft(GOLD, [[0, 1], [0.35, 0.45], [1, 0]]);
  const haze = soft('255, 140, 88', [[0, 0.75], [0.35, 0.4], [0.7, 0.1], [1, 0]]); // deeper than the lanterns: stacked, it must not turn yellow

  let kind: Kind = 'wide';
  let R = route.wide;
  let map = (p: Pt): Pt => p;
  let k = 1; // screen px per image px
  let on = false;
  let why: { at: Pt; text: number[] } | null = null;
  let text: Rect[] = [];
  let rearAt = 0; // the words on the opening scene, in canvas px
  let gate = -1; // new caravans are seen only after this point of the road (text before it)
  // When they are, they set out this much earlier (seconds), so they still come into sight on time.
  // Fixed once a new caravan is under way: a later change of layout must not make it jump.
  let early = 0;
  let heraldAt = 0; // where on the road the light shows: clear of the words, so it is never cut by them
  let xMax = 1e9; // the picture's right edge on screen, at the drift's widest (image px)
  let clock = 0;
  let road: Road = null!;

  function build(r: (typeof route)[Kind]) {
    const n = 1500;
    const { pts, total } = trace(r.pts, n);
    const ds = total / (n - 1);
    const scale = pts.map(([, y]) => clamp((y - r.horizon) / (r.near - r.horizon), 0.12, 1.15));
    const T = [0], D = [0];
    for (let i = 1; i < n; i++) {
      const s = (scale[i] + scale[i - 1]) / 2;
      const v = SPEED * s ** DEPTH * ((pts[i][2] + pts[i - 1][2]) / 2 > 0.05 ? 1 : HIDDEN_RUSH);
      T.push(T[i - 1] + ds / v);
      D.push(D[i - 1] + ds / s);
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
    const painted = cells.map((c, j) => ({ j, T: T[near(c.painted[0], c.painted[1])], at: c.painted })).sort((a, b) => b.T - a.T);
    const lead0 = painted[0].T;
    const first = painted.map((p) => ({ off: lead0 - p.T, body: p.j, at: p.at }));
    // where new caravans come into sight
    let rise = pts.findIndex((p) => p[2] > 0.5);
    return { pts, scale, T, D, n, total, Ttot: T[n - 1], lead0, gapT, first, rise };
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
    const count = grand ? 13 : 6;
    for (let i = 0; i < count; i++) {
      out.push({ off, body: Math.floor(r() * bodies.cells.length) });
      // not evenly spaced: small knots of camels, and wider gaps between them
      const knot = grand ? (i % 4 === 3 ? 1.55 : 0.88) : 1;
      off += road.gapT * knot * (0.9 + r() * 0.25);
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

  function caravans() {
    const out: Team[] = [];
    const { Ttot } = road;
    const every = NEXT_AT * Ttot;
    const first = firstAt();
    const span = Ttot + 20 * road.gapT;
    if (first < span) out.push({ n: 0, t: first, grand: false });
    const c1 = first - every + early; // number 1's own time on the road (negative: still to come)
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
      const s = lerp(road.scale, f) * (1 - hold) + hold;
      const a = road.pts[Math.max(0, Math.floor(f) - 4)], b = road.pts[Math.min(road.n - 1, Math.floor(f) + 4)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const turn = dx / (Math.hypot(dx, dy) || 1);
      const face = turn >= 0 ? 1 : -1;
      const narrow = Math.max(0.3, Math.abs(turn)) * (1 - hold) + hold;
      const legs = (lerp(road.D, f) / (R.size / STEP)) + i * 0.37;
      const done = t / road.Ttot;
      const seen = gate < 0 || c.n === 0 ? 1 : smooth(gate, gate + 40, f);
      const edge = 1 - smooth(xMax - 40, xMax - 6, x);
      const body = vis * edge * smooth(0.17, 0.32, s) * Math.min(1, seen * 1.4);
      const light = vis * edge * Math.min(1, seen * 2) * (1 - smooth(0.965, 1, done)) * handover;
      list.push({ i, t, f, x, y, s, face, narrow, legs, body, light, seen, grand: c.grand, cell: bodies.cells[m.body], c });
    });
    return list;
  }

  // How strongly the light of caravan c shows behind the ridge before it comes over, and where.
  function herald(c: Team) {
    if (c.n === 0) return { a: 0, ix: 0 };
    const ahead = smooth(early - HERALD, early, c.t); // the light comes first, the camels after
    const comeT = road.T[gate > 0 ? Math.round(gate + 30) : road.rise + 30];
    const after = 1 - smooth(comeT, comeT + 9, c.t);
    const a = ahead * after * (c.grand ? 1.8 : 0.7); // above 1: stamped twice (it sits under the page's dark veil)
    return { a, ix: heraldAt };
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
    const bob = 0.35 * Math.cos(4 * Math.PI * ph);
    // body box, relative to the feet
    const bx = -cell.foot[0], by = -cell.foot[1] + bob;
    const legLen = cell.foot[1] - cell.belly + 0.6;
    const L = cell.shoulder - cell.hip;
    const stride = 0.42 * L + 2.2, lift = 0.16 * legLen;
    const leg = (hipX: number, u: number, fore: boolean, col: string, w: number) => {
      const hx = bx + hipX, hy = by + cell.belly - 0.6;
      const [fx, fy] = footAt(u, stride, lift);
      const l1 = legLen * (fore ? 0.52 : 0.56), l2 = legLen * (fore ? 0.6 : 0.58); // longer than the reach: the knee bends
      const [kx, ky] = knee(hx, hy, hx + fx, fy - 0.15, l1, l2, fore);
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(kx, ky);
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(kx, ky);
      ctx.lineTo(hx + fx, fy - 0.15);
      ctx.lineWidth = w * 0.72;
      ctx.stroke();
    };
    // the painted legs are dark, warmed by the glowing road under them
    const [r, g, b] = mix(cell.leg, [150, 72, 44], 0.35).map(Math.round);
    const near = `rgb(${r}, ${g}, ${b})`;
    const far = `rgb(${Math.round(r * 0.75)}, ${Math.round(g * 0.75)}, ${Math.round(b * 0.8)})`;
    ctx.lineCap = 'round';
    // a camel paces: both legs on one side move together; the far side half a cycle later
    leg(cell.hip + 0.6, (ph + 0.5) % 1, false, far, 1.35);
    leg(cell.shoulder + 0.4, (ph + 0.52) % 1, true, far, 1.2);
    ctx.drawImage(img('bodies.webp'), cell.x, 0, cell.w, cell.h, bx, by, cell.w, cell.h);
    leg(cell.hip, ph, false, near, 1.55);
    leg(cell.shoulder, (ph + 0.02) % 1, true, near, 1.35);
  }

  function lanternOf(m: Walker): Pt {
    const [sx, sy] = map([m.x, m.y]);
    const kk = m.s * k;
    const cell = m.cell;
    const L = cell.lantern || [cell.foot[0] + 4, cell.foot[1] - cell.height + 1];
    const ph = ((m.legs % 1) + 1) % 1;
    const sway = 0.35 * Math.sin(m.legs * Math.PI * 2 + m.i);
    const rise = (1 - m.seen) * cell.height * 0.9;
    return [sx + m.face * m.narrow * (L[0] - cell.foot[0] + sway) * kk, sy + (L[1] - cell.foot[1] + rise + 0.35 * Math.cos(4 * Math.PI * ph)) * kk];
  }

  // A ribbon of silk from one camel's load, streaming back along the way they came and up toward the
  // sky. Sheer: a faint fill, brighter edges, a sheen where it turns edge-on; additive, like the sky's.
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
    const air = 4;
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
      const r = road && { Ttot: road.Ttot, lead0: road.lead0, every: NEXT_AT * road.Ttot, second: FADE_IN + SET_OFF / 2 + NEXT_AT * road.Ttot - road.lead0, xMax, firstArrives: FADE_IN + SET_OFF / 2 + road.Ttot - road.lead0 };
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
    /**
     * Call whenever the canvas is laid out, and whenever the words move. `avoid`: rects [x0, y0, x1, y1]
     * of the words, in canvas px. `rightEdge`: the right edge of what is seen of the canvas at the
     * drift's widest (canvas px). Only the layout changes: the caravans walk on where they are.
     */
    setup(which: Kind, mapFn: (p: Pt) => Pt, scale: number, avoid: Rect[] = [], rightEdge: number | null = null) {
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
      const hw = 0.7 * R.size * k, up = 1.4 * R.size * k, air = 6;
      why = null;
      let last = -1;
      road.pts.forEach(([x, y, v], i) => {
        if (i % 3 || v < 0.05) return;
        const [sx, sy] = map([x, y]);
        const hit = avoid.find(([x0, y0, x1, y1]) => sx + hw > x0 - air && sx - hw < x1 + air && sy + 2 > y0 - air && sy - up < y1 + air);
        if (hit) {
          last = i;
          why = { at: [Math.round(sx), Math.round(sy)], text: hit.map(Math.round) };
        }
      });
      // Where the words come near the road only up to where the painted caravan already stands (its
      // leader), new
      // caravans come into sight after that point (from behind the ridge); past it, it stays as painted.
      // On phones (the tall picture) it always stays: the caravan is small there, deep under the words'
      // dark veil, and right under the wordmark.
      const lead = Math.floor(at(road.lead0));
      rearAt = lead;
      on = which === 'wide' && last <= lead;
      gate = last < 0 ? -1 : Math.max(road.rise, last + 6);
      const underWay = firstAt() - NEXT_AT * road.Ttot + early + HERALD > 0; // number 1's light already showing
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
      if (!this.active) return;
      clock += dt;
      teams = caravans();
      scene = [];
      for (const c of teams) if (c.t >= 0) scene.push(...camelsOf(c));
      scene.sort((a, b) => a.y - b.y);
      // sparks of lantern light drifting up from behind the ridge before the grand caravan comes
      for (const c of teams) {
        if (!c.grand) continue;
        const { a, ix } = herald(c);
        if (a < 0.05 || rand() > dt * 16 * Math.min(1, a)) continue;
        const j = clamp(Math.round(ix + (rand() - 0.3) * 120), Math.max(road.rise, gate), road.n - 1);
        const [px, py] = map(road.pts[j]);
        const q = road.scale[j] * k;
        motes.push({ x: px + (rand() - 0.5) * 6 * q, y: py - rand() * 3 * q, vx: (rand() - 0.3) * 3 * q, vy: -(6 + rand() * 8) * q, life: 0, max: 2.4 + rand() * 1.8, r: (0.8 + rand() * 0.7) * Math.max(0.9, q), a: Math.min(1, a), rise: true });
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
      // light coming over the ridge before a caravan does (behind the dune in front, which is drawn after)
      ctx.globalCompositeOperation = 'lighter';
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
        for (let left = a; left > 0.01; left -= 1) {
          ctx.globalAlpha = Math.min(1, left);
          ctx.drawImage(haze, x - 85 * kk, y - 34 * kk, 170 * kk, 56 * kk);
          ctx.globalAlpha = Math.min(1, left) * 0.8;
          ctx.drawImage(haze, x - 50 * kk, y - 18 * kk, 100 * kk, 30 * kk);
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter';
        // and the crest of the ridge catches the light, brightest where they will come over
        for (let j = lo; j <= Math.min(road.n - 1, ix + 140); j += 3) {
          const [px, py] = map(road.pts[j]);
          const q = road.scale[j] * k;
          const w = Math.exp(-(((j - ix) / 100) ** 2));
          ctx.globalAlpha = Math.min(1, a * 0.4 * w);
          ctx.drawImage(glow, px - 6 * q, py - 2.4 * q, 12 * q, 4.8 * q);
        }
        // the ridge's outline picked out in a thin line of gold, against the light behind it
        ctx.lineCap = 'round';
        for (let j = lo; j < Math.min(road.n - 1, ix + 160); j += 2) {
          const w = Math.exp(-(((j - ix) / 110) ** 2));
          if (w < 0.03) continue;
          const [p0x, p0y] = map(road.pts[j]), [p1x, p1y] = map(road.pts[j + 2]);
          const q = road.scale[j] * k;
          ctx.globalAlpha = Math.min(1, a * 0.9 * w);
          ctx.strokeStyle = 'rgb(255, 186, 96)';
          ctx.lineWidth = Math.max(1.2, 1.5 * q);
          ctx.beginPath();
          ctx.moveTo(p0x, p0y - 0.6 * q);
          ctx.lineTo(p1x, p1y - 0.6 * q);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
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
      // the road glows where the grand caravan has passed, and slowly cools again
      for (const c of teams) {
        if (!c.grand || c.t <= 0) continue;
        const fade = Math.min(1, c.t / 3);
        const j1 = Math.floor(at(c.t));
        for (let j = Math.max(0, j1 - 700); j <= j1; j += 3) {
          const since = c.t - road.T[j];
          const glowA = smooth(0, 2, since) * Math.exp(-since / 8) * fade;
          const p = road.pts[j];
          if (glowA < 0.02 || p[2] < 0.3) continue;
          const seen = gate < 0 ? 1 : smooth(gate, gate + 40, j);
          const edge = 1 - smooth(xMax - 40, xMax - 6, p[0]);
          const [x, y] = map(p);
          const r = 4 * road.scale[j] * k;
          ctx.globalAlpha = 0.55 * glowA * p[2] * seen * edge;
          ctx.drawImage(ember, x - r * 1.6, y - r * 0.7, r * 3.2, r * 1.4);
        }
      }
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
        const core = Math.max(1.2, 1.8 * kk) * big;
        ctx.globalAlpha = a * (m.grand ? 0.6 : 0.45);
        ctx.drawImage(glow, lx - core, ly - core, core * 2, core * 2);
        if (m.body > 0.05) {
          const [sx, sy] = map([m.x, m.y]);
          const pw = 18 * kk, ph = 5 * kk;
          ctx.globalAlpha = (m.grand ? 0.38 : 0.3) * m.body * flick;
          ctx.drawImage(glow, sx - pw, sy - ph, pw * 2, ph * 2);
        }
      }
      for (const p of motes) {
        const a = p.a * Math.sin(Math.PI * (p.life / p.max)) * smooth(4, 24, toWords(p.x, p.y)); // fade before the words, no hard edge
        if (a <= 0.01) continue;
        ctx.globalAlpha = clamp(a, 0, 1);
        const r = p.r * 2.2;
        ctx.drawImage(ember, p.x - r, p.y - r, r * 2, r * 2);
      }
      // silk: one long strand from the leader's load, streaming back over the whole caravan (a second,
      // shorter one was tried and dropped: one strand reads as a gesture, two as shapes)
      for (const m of scene) {
        if (!m.grand) continue;
        if (m.i === 0) ribbon(ctx, m, { lag: 9, lift: 4.5, seed: m.c.n, N: 56 }, clockSky);
      }
      ctx.restore();
    },
  };
}
