/**
 * Made with the hairline-create skill; its page and look sheet live outside
 * the repo. Edit the figure there and copy it back, keeping these two lines
 * and the import and export.
 *
 * Pour: an espresso cup, and coffee running into it from a nozzle. The pointer's
 * height sets how far the coffee has risen, on a spring; the coffee's surface
 * is the bright edge, with its crema as a dim ring inside it. At rest the cup
 * is a little under half full and still pouring. The slider is how full the
 * pointer can take it, as a share of the cup.
 *
 * Driven from outside, `pourTo(level, pouring)` sets the level and the stream
 * instead, and the pointer is left alone: the shot fills the cup.
 */
import HL from "./kernel"

const {
  Cam, clamp, circ, facing, fillet, fit, hull, open, poly, proj, ringAt, run,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const FOOT = 16, TOP = 24, CUP = 22, WALL = 2, FLOOR = 3, NOZZLE = 44, NOZZLE_TOP = 54, GRAMS = 70, REST = 0.45;
/** Across the screen, and out of it towards the viewer, on the ground. */
const D = [Math.SQRT1_2, -Math.SQRT1_2], N = [Math.SQRT1_2, Math.SQRT1_2];

/** The cup's outer radius at height z, and the coffee's height at a level 0–1. */
const outerAt = (z) => FOOT + ((TOP - FOOT) * z) / CUP;
const zOf = (level) => FLOOR + (CUP - FLOOR - 1.5) * level;
/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The cup's handle, a loop standing out sideways: its back edge, its face and the hole. */
function handle(P) {
  const w = (off) => ([s, z]) => P(s * D[0] + off * N[0], s * D[1] + off * N[1], z);
  const outer = fillet([[outerAt(18) - 1, 18], [34, 18], [34, 5], [outerAt(5) - 1, 5]], [1, 5, 5, 1]);
  const hole = fillet([[outerAt(15) + 1.5, 15], [30.5, 15], [30.5, 8], [outerAt(8) + 1.5, 8]], [1, 2.5, 2.5, 1]);
  return { back: poly(outer.map(w(-2.5))), face: poly(outer.map(w(0))), hole: poly(hole.map(w(0))) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, driven = false, pouring = true;

  const C = Cam(45, 0.5, 4.2);
  const side = (s, z) => [s * D[0], s * D[1], z];
  fit(C, [side(-TOP, 0), side(-TOP, CUP), side(34, 18), side(34, 0), [-TOP, -TOP, CUP], [TOP, TOP, 0], [0, 0, NOZZLE_TOP]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg), path = (cls) => mk("path", { class: cls }, g);

  // The cup's far half: its body, the rim's inner edge and the floor inside it.
  const foot = circ(FOOT, 40), top = circ(TOP, 40), lip = circ(TOP - WALL, 40);
  path("sil").setAttribute("d", poly(hull(ringAt(P, foot, 0).concat(ringAt(P, top, CUP)))));
  path("nf").setAttribute("d", poly(ringAt(P, lip, CUP)));
  path("nf lo").setAttribute("d", open(ringAt(P, run(circ(outerAt(FLOOR) - WALL, 40), (q) => !front(q)), FLOOR)));

  // The coffee and the stream, then the near wall over them.
  const surface = path("nf hi"), crema = path("nf lo"), stream = path("fo"), banks = path("nf");
  const iF = LR(ringAt(P, run(lip, front), CUP)), oT = LR(ringAt(P, run(top, front), CUP)), oB = LR(ringAt(P, run(foot, front), 0));
  path("fo").setAttribute("d", poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]));
  path("nf lo").setAttribute("d", open(oT));
  path("nf").setAttribute("d", open(iF));
  path("nf sil").setAttribute("d", open([oT[0], ...oB, oT[oT.length - 1]]));

  const h = handle(P);
  path("lo").setAttribute("d", h.back);
  path("sil").setAttribute("d", h.face);
  path("").setAttribute("d", h.hole);

  // The nozzle the coffee runs from: a short taper, wider at the top.
  put(solid(g), {
    sil: poly(hull(ringAt(P, circ(2.8, 24), NOZZLE).concat(ringAt(P, circ(4.8, 24), NOZZLE_TOP)))),
    crease: open(ringAt(P, run(circ(3.8, 24), front), NOZZLE_TOP)),
  });

  const level = spring(REST, { eps: 0.002 });
  let drawn = NaN, drawnPour = null;
  function draw() {
    const l = level.x;
    if (l === drawn && pouring === drawnPour) return;
    drawn = l; drawnPour = pouring;
    const z = zOf(l), r = outerAt(z) - WALL, full = l > 0.02;
    surface.setAttribute("d", full ? poly(ringAt(P, circ(r, 40), z)) : "");
    crema.setAttribute("d", full ? poly(ringAt(P, circ(r * 0.62, 32), z)) : "");
    // A ribbon across the screen, narrowing a little as it falls: filled, and
    // outlined down its two sides only, so its foot runs into the coffee.
    const at = (w, zz) => P(w * D[0], w * D[1], zz);
    stream.setAttribute("d", pouring ? poly([at(-2, NOZZLE), at(2, NOZZLE), at(1.5, z), at(-1.5, z)]) : "");
    banks.setAttribute("d", pouring ? open([at(-2, NOZZLE), at(-1.5, z)]) + open([at(2, NOZZLE), at(1.5, z)]) : "");
  }

  const B = register(stage, (dt) => {
    const moving = stepS(level, dt);
    draw();
    return moving;
  });
  bag.add(B.unregister);

  // The pointer's height against the cup at rest: the floor at the bottom,
  // the brim at the top. Nothing it measures ever moves.
  const yFloor = P(0, 0, zOf(0))[1], yBrim = P(0, 0, zOf(1))[1];
  function aim(p) {
    if (driven) return;
    if (!p) { level.t = REST; read.textContent = "rest"; B.wake(); return; }
    const t = clamp((yFloor - p[1]) / (yFloor - yBrim), 0, 1) * reach;
    level.t = t;
    read.textContent = `${Math.round(t * GRAMS)} g`;
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, down: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v; },
    /** The level from outside, 0–1 of the cup, and whether the shot is still running. */
    pourTo: (l, on) => {
      driven = true;
      level.t = clamp(l, 0, 1);
      pouring = on;
      read.textContent = `${Math.round(level.t * GRAMS)} g`;
      B.wake();
    },
    destroy: bag.dispose,
  };
}

/** The figure as the hairline-create skill declares it, for the espresso
    example to mount on its own host. */
export const pour = {
  name: "pour",
  means: "An espresso cup filling from a nozzle: the pointer's height sets how far the coffee has risen.",
  rules: [1, 5, 6, 8],
  range: [0.6, 0.8, 0.95],
  tour: [[180, 207], [180, 183], [180, 157], null],
  mount,
};
