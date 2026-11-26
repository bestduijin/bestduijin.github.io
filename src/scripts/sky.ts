// Light that moves over the painted opening scene (public/hero/hero_*.webp):
// sparks flowing along the silk ribbons, twinkling stars, a shooting star now and then,
// caravan lanterns that flicker and a city glow that breathes.
//
// Every position is written in the picture's own coordinates (0–1 across and down),
// read off the two paintings, and mapped onto the screen the same way CSS
// `object-fit: cover` places the picture. Change the paintings → re-trace these.
//
// The caravan (caravan.ts) walks on the same canvas, in the same animation frame: once it is under
// way, it carries its own lanterns, so the painted ones here stop flickering.

import type { Caravan } from './caravan';

type Pt = [number, number];
type Flow = { pts: Pt[]; color: string; count: number; speed: number; size: number };
type Layout = {
  flows: Flow[];
  starsBelow: number; // stars only above this line
  lanterns: Pt[];
  glow: { at: Pt; r: number };
};

const ROSE = '255, 160, 185';
const GOLD = '255, 214, 150';
const TEAL = '150, 240, 228';
const WARM = '255, 190, 110';

const WIDE: Layout = {
  flows: [
    { pts: [[-0.02, 0.13], [0.1, 0.17], [0.22, 0.24], [0.33, 0.33], [0.45, 0.4], [0.55, 0.38], [0.62, 0.31], [0.72, 0.27], [0.8, 0.3], [0.9, 0.25], [1.02, 0.12]], color: ROSE, count: 34, speed: 0.022, size: 1.6 },
    { pts: [[-0.02, 0.06], [0.12, 0.1], [0.25, 0.18], [0.38, 0.28], [0.5, 0.3], [0.62, 0.27], [0.75, 0.2], [0.85, 0.14], [0.95, 0.1], [1.02, 0.03]], color: GOLD, count: 34, speed: 0.026, size: 1.7 },
    { pts: [[0.12, 0.12], [0.22, 0.22], [0.3, 0.35], [0.38, 0.47], [0.5, 0.44], [0.6, 0.4]], color: TEAL, count: 18, speed: 0.03, size: 1.4 },
    { pts: [[0.55, 0.42], [0.7, 0.43], [0.82, 0.47], [0.92, 0.5]], color: GOLD, count: 12, speed: 0.04, size: 1.2 },
    { pts: [[0.62, 0.67], [0.7, 0.645], [0.78, 0.62], [0.86, 0.58], [0.93, 0.53]], color: WARM, count: 10, speed: 0.018, size: 1.1 },
  ],
  starsBelow: 0.45,
  lanterns: [[0.635, 0.66], [0.655, 0.657], [0.675, 0.655], [0.695, 0.652], [0.71, 0.648]],
  glow: { at: [0.93, 0.49], r: 0.09 },
};

const TALL: Layout = {
  flows: [
    { pts: [[-0.02, 0.02], [0.1, 0.09], [0.2, 0.18], [0.32, 0.22], [0.45, 0.2], [0.6, 0.14], [0.75, 0.1], [0.9, 0.04], [1.02, 0.0]], color: ROSE, count: 26, speed: 0.024, size: 1.6 },
    { pts: [[0.55, 0.02], [0.7, 0.07], [0.85, 0.13], [0.97, 0.19], [0.9, 0.26], [0.75, 0.27], [0.6, 0.26]], color: GOLD, count: 18, speed: 0.028, size: 1.6 },
    { pts: [[-0.02, 0.25], [0.12, 0.26], [0.25, 0.29], [0.35, 0.32], [0.5, 0.3], [0.65, 0.28], [0.8, 0.3], [1.02, 0.28]], color: TEAL, count: 22, speed: 0.026, size: 1.4 },
    { pts: [[-0.02, 0.37], [0.15, 0.35], [0.3, 0.33], [0.45, 0.32], [0.6, 0.34], [0.75, 0.32], [1.02, 0.3]], color: GOLD, count: 18, speed: 0.03, size: 1.3 },
    { pts: [[0.1, 0.44], [0.3, 0.42], [0.5, 0.41], [0.62, 0.43], [0.75, 0.41]], color: WARM, count: 10, speed: 0.03, size: 1.1 },
  ],
  starsBelow: 0.4,
  lanterns: [[0.25, 0.488], [0.32, 0.486], [0.37, 0.484], [0.41, 0.482], [0.46, 0.48]],
  glow: { at: [0.78, 0.415], r: 0.12 },
};

// Catmull–Rom spline through the points, sampled evenly by length.
function trace(pts: Pt[], n = 240): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 30; k++) {
      const t = k / 30, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  // resample by arc length
  const len = [0];
  for (let i = 1; i < out.length; i++) len.push(len[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  const total = len[len.length - 1];
  const even: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const want = (i / (n - 1)) * total;
    while (j < len.length - 2 && len[j + 1] < want) j++;
    const u = (want - len[j]) / (len[j + 1] - len[j] || 1);
    even.push([out[j][0] + (out[j + 1][0] - out[j][0]) * u, out[j][1] + (out[j + 1][1] - out[j][1]) * u]);
  }
  return even;
}

// Small seeded random, so every visit looks the same.
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

type Rect = [number, number, number, number];
type Extras = {
  caravan?: Caravan;
  // the words on the opening scene, in canvas px (see Page.astro)
  avoid?: () => Rect[];
  // the right edge of what is seen of the canvas at the drift's widest, in canvas px
  edge?: (width: number) => number;
};

export function startSky(canvas: HTMLCanvasElement, img: HTMLImageElement, extras: Extras = {}) {
  const { caravan, avoid = () => [], edge } = extras;
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;
  let map = (p: Pt): Pt => p;
  let scale = 1;
  let layout = WIDE;
  let paths: Pt[][] = [];
  let sparks: { flow: number; s: number; v: number; tw: number }[] = [];
  let stars: { p: Pt; r: number; w: number; ph: number }[] = [];
  let shoot: { t0: number; from: Pt; to: Pt } | null = null;
  let nextShoot = 4;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let placeCaravan: () => void = () => {};

  function setup() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    layout = /tall/.test(img.currentSrc) ? TALL : WIDE;
    const iw = img.naturalWidth || (layout === TALL ? 1024 : 1774);
    const ih = img.naturalHeight || (layout === TALL ? 1536 : 887);
    scale = Math.max(W / iw, H / ih);
    const ox = (W - iw * scale) / 2, oy = (H - ih * scale) / 2;
    map = ([x, y]) => [ox + x * iw * scale, oy + y * ih * scale];
    // the caravan's points are in the picture's pixels, not 0–1
    placeCaravan = () => caravan?.setup(layout === TALL ? 'tall' : 'wide', ([x, y]) => [ox + x * scale, oy + y * scale], scale, avoid(), edge ? edge(W) : null);
    placeCaravan();

    paths = layout.flows.map((f) => trace(f.pts).map(map));
    const r = rng(7);
    // on a new size of the same picture, the sparks carry on from where they are
    const was = sparks;
    sparks = [];
    layout.flows.forEach((f, flow) => {
      for (let i = 0; i < f.count; i++) sparks.push({ flow, s: r(), v: f.speed * (0.6 + r() * 0.8), tw: r() * 6.28 });
    });
    if (was.length === sparks.length) sparks.forEach((sp, i) => (sp.s = was[i].s));
    stars = Array.from({ length: Math.round((W * H) / 9000) }, () => ({
      p: map([r(), r() * layout.starsBelow]),
      r: 0.5 + r() * 1.1,
      w: 0.6 + r() * 2.2,
      ph: r() * 6.28,
    }));
  }

  function dot(x: number, y: number, r: number, color: string, a: number) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(${color}, ${a})`);
    g.addColorStop(0.35, `rgba(${color}, ${a * 0.35})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    paint(dt);
    raf = requestAnimationFrame(frame);
  }

  // Whether anything has been painted yet (before that, the canvas is meant to be empty: the
  // painting as it is).
  let painted = false;
  function paint(dt: number) {
    painted = true;
    clock += dt;
    ctx.clearRect(0, 0, W, H);
    // the caravan's ground first (patches, camels, the dune in front), in normal blending
    if (caravan) {
      caravan.step(dt);
      caravan.drawGround(ctx);
    }
    ctx.globalCompositeOperation = 'lighter';
    const k = Math.max(0.8, Math.min(1.6, scale * 1.3)); // sizes follow the picture's scale

    // city glow breathing
    const [gx, gy] = map(layout.glow.at);
    const gr = layout.glow.r * Math.max(W, H) * (1 + 0.06 * Math.sin(clock * 0.8));
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, `rgba(${WARM}, ${0.1 + 0.05 * Math.sin(clock * 0.8)})`);
    glow.addColorStop(1, `rgba(${WARM}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);

    // stars
    for (const s of stars) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(clock * s.w + s.ph));
      dot(s.p[0], s.p[1], s.r * k * 0.8, '255, 255, 255', a);
    }

    // sparks along the ribbons, each with a short tail
    for (const sp of sparks) {
      sp.s = (sp.s + sp.v * dt) % 1;
      const path = paths[sp.flow];
      const f = layout.flows[sp.flow];
      const fade = Math.min(1, sp.s * 8, (1 - sp.s) * 8); // fade in and out at the ends
      const tw = 0.65 + 0.35 * Math.sin(clock * 3 + sp.tw);
      for (let t = 0; t < 6; t++) {
        const s = sp.s - t * 0.004;
        if (s < 0) break;
        const p = path[Math.floor(s * (path.length - 1))];
        dot(p[0], p[1], f.size * k * (1 - t * 0.12), f.color, 0.9 * fade * tw * (1 - t / 6));
      }
    }

    // lanterns: the caravan's own once it walks, else the painted ones flicker
    if (caravan?.active) caravan.drawLights(ctx, clock);
    else
      layout.lanterns.forEach((l, i) => {
        const [x, y] = map(l);
        const a = 0.55 + 0.3 * Math.sin(clock * 7 + i * 1.7) * Math.sin(clock * 2.3 + i);
        dot(x, y, 1.6 * k, WARM, a);
      });

    // a shooting star every 6–12 seconds
    if (!shoot && clock > nextShoot) {
      const r = Math.random;
      const from = map([0.45 + r() * 0.5, r() * 0.12]);
      shoot = { t0: clock, from, to: [from[0] - W * 0.18, from[1] + H * 0.12] };
      nextShoot = clock + 6 + r() * 6;
    }
    if (shoot) {
      const u = (clock - shoot.t0) / 0.9;
      if (u >= 1) shoot = null;
      else {
        const x = shoot.from[0] + (shoot.to[0] - shoot.from[0]) * u;
        const y = shoot.from[1] + (shoot.to[1] - shoot.from[1]) * u;
        const tx = x + (shoot.from[0] - shoot.to[0]) * 0.25, ty = y + (shoot.from[1] - shoot.to[1]) * 0.25;
        const line = ctx.createLinearGradient(x, y, tx, ty);
        const a = Math.sin(u * Math.PI);
        line.addColorStop(0, `rgba(255, 255, 255, ${0.9 * a})`);
        line.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // A new size empties the canvas. While paused, paint the moment it stopped at again (the
  // clock does not move), so the light and the caravan stay where they were.
  const ready = () => {
    setup();
    if (!raf && painted) paint(0);
  };
  if (img.complete) ready();
  img.addEventListener('load', ready); // also when the picture swaps between wide and tall
  new ResizeObserver(ready).observe(canvas);

  return {
    // the words moved (fonts, a language note, a new size): only the caravan's way round them changes
    relayout() {
      placeCaravan();
    },
    running(on: boolean) {
      if (on && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!on && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
  };
}
