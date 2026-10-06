import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/components/MathField.tsx", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(
  `${source}\nexport { drawOrbit, lorenzPoint };`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;
const module = { exports: {} };
vm.runInNewContext(javascript, {
  exports: module.exports,
  require: () => ({}),
});
const { drawOrbit, lorenzPoint } = module.exports;

function render(figure, width = 900, elapsed = 0) {
  const points = [];
  const strokes = [];
  const context = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo: (x, y) => points.push([x, y]),
    lineTo: (x, y) => points.push([x, y]),
    stroke() {
      strokes.push([this.strokeStyle, this.lineWidth]);
    },
  };
  drawOrbit(context, width, width, elapsed, 0, 0, 0, figure, true);
  assert.ok(points.every((point) => point.every(Number.isFinite)));
  return { points, strokes };
}

test("all morphs keep continuous geometry and styling at figure boundaries", () => {
  for (const width of [390, 900]) {
    for (let boundary = 1; boundary <= 4; boundary += 1) {
      const before = render(boundary - 0.0001, width);
      const at = render(boundary, width);
      const after = render(boundary + 0.0001, width);
      assert.equal(before.points.length, at.points.length);
      assert.equal(after.points.length, at.points.length);
      assert.deepEqual(before.strokes, at.strokes);
      assert.deepEqual(after.strokes, at.strokes);
      for (let index = 0; index < at.points.length; index += 1) {
        for (const neighbor of [before, after]) {
          assert.ok(
            Math.hypot(
              at.points[index][0] - neighbor.points[index][0],
              at.points[index][1] - neighbor.points[index][1],
            ) < 0.01,
          );
        }
      }
    }
  }
});

test("Lorenz trajectory pieces meet exactly and preserve both butterfly lobes", () => {
  for (const fibers of [22, 34]) {
    for (let fiber = 0; fiber < fibers - 1; fiber += 1) {
      assert.deepEqual(
        lorenzPoint(1, fiber / (fibers - 1), fibers),
        lorenzPoint(0, (fiber + 1) / (fibers - 1), fibers),
      );
    }
  }
  const { points } = render(3);
  const xs = points.map(([x]) => x);
  assert.ok(Math.min(...xs) < 900 * 0.35);
  assert.ok(Math.max(...xs) > 900 * 0.65);
});

test("figure changes preserve the running canvas and static mode redraws immediately", () => {
  const refs = [];
  const effects = [];
  let hook = 0;
  let effectIndex = 0;
  let layoutReads = 0;
  let paints = 0;
  let now = 0;
  let frame;
  const context = {
    clearRect() {
      paints += 1;
    },
    setTransform() {},
    save() {},
    restore() {},
    fillText() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    arc() {},
    fill() {},
  };
  const canvas = {
    getContext: () => context,
    getBoundingClientRect() {
      layoutReads += 1;
      return { width: 900, height: 900, left: 0, top: 0 };
    },
  };
  const query = {
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  };
  const react = {
    useRef(value) {
      const index = hook++;
      return (refs[index] ??= { current: index === 0 ? canvas : value });
    },
    useEffect(callback, dependencies) {
      const index = effectIndex++;
      const previous = effects[index];
      if (
        previous &&
        dependencies.every((value, i) =>
          Object.is(value, previous.dependencies[i]),
        )
      )
        return;
      previous?.cleanup?.();
      effects[index] = { dependencies, callback };
    },
  };
  const harness = { exports: {} };
  const observer = class {
    observe() {}
    disconnect() {}
  };
  vm.runInNewContext(javascript, {
    exports: harness.exports,
    require: (name) => (name === "react" ? react : { jsx() {} }),
    window: {
      matchMedia: () => query,
      devicePixelRatio: 1,
      addEventListener() {},
      removeEventListener() {},
    },
    document: {
      hidden: false,
      addEventListener() {},
      removeEventListener() {},
    },
    performance: { now: () => now },
    ResizeObserver: observer,
    IntersectionObserver: observer,
    requestAnimationFrame(callback) {
      frame = callback;
      return 1;
    },
    cancelAnimationFrame() {
      frame = null;
    },
  });
  const rerender = (props) => {
    hook = 0;
    effectIndex = 0;
    harness.exports.default(props);
    for (const effect of effects) {
      if (!effect.callback) continue;
      effect.cleanup = effect.callback();
      effect.callback = null;
    }
  };
  rerender({ figure: 0 });
  now = 1000;
  frame(now);
  const reads = layoutReads;
  rerender({ figure: 1 });
  rerender({ figure: 2 });
  rerender({ figure: 3 });
  assert.equal(
    layoutReads,
    reads,
    "switching figures must not resize or restart the canvas",
  );
  assert.ok(frame);
  rerender({ figure: 3, motionOff: true });
  assert.equal(frame, null);
  const staticPaints = paints;
  rerender({ figure: 4, motionOff: true });
  assert.equal(paints, staticPaints + 1);
  for (const effect of effects) effect.cleanup?.();
});
