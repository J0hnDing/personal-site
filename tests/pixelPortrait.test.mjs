import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const javascript = ts.transpileModule(
  `${readFileSync(new URL("../src/components/QuickIntroduction.tsx", import.meta.url), "utf8")}\nexport { PixelPortrait };`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

test("portrait frames avoid layout reads and keep the resolved canvas on resize", () => {
  let now = 0;
  let layoutReads = 0;
  let resolvedUpdates = 0;
  let frameId = 0;
  let resize;
  let cleanup;
  const frames = new Map();
  const calls = [];
  const contexts = [];
  const image = {
    complete: true,
    naturalWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
  };
  const context = { drawImage: (...args) => calls.push(args) };
  const canvas = {
    width: 0,
    height: 0,
    getContext: (_, options) => {
      contexts.push(options);
      return context;
    },
    getBoundingClientRect: () => {
      layoutReads += 1;
      return { width: 400, height: 533 };
    },
  };
  const sample = {
    getContext: (_, options) => {
      contexts.push(options);
      return { drawImage() {} };
    },
  };
  const refs = [image, canvas];
  const exports = {};
  vm.runInNewContext(javascript, {
    exports,
    require: (name) => {
      if (name === "react/jsx-runtime")
        return {
          jsx: (type, props) => ({ type, props }),
          jsxs: (type, props) => ({ type, props }),
        };
      if (name === "react")
        return {
          useRef: () => ({ current: refs.shift() }),
          useState: () => [false, () => (resolvedUpdates += 1)],
          useEffect: (effect) => (cleanup = effect()),
        };
      return {};
    },
    document: {
      hidden: false,
      createElement: () => sample,
      addEventListener() {},
      removeEventListener() {},
    },
    window: { devicePixelRatio: 2 },
    performance: { now: () => now },
    requestAnimationFrame: (callback) => {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    ResizeObserver: class {
      constructor(callback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  });
  const rendered = exports.PixelPortrait({
    motionOff: false,
    reveal: { startedAt: 500, durationMs: 800 },
  });
  assert.ok(contexts.every((options) => options.willReadFrequently));
  assert.equal(layoutReads, 1);
  const initialSampleWidth = sample.width;
  for (const time of [200, 499, 500, 700, 900, 1100, 1300]) {
    now = time;
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback());
    if (time <= 500) {
      assert.equal(sample.width, initialSampleWidth);
      assert.equal(resolvedUpdates, 0);
    } else if (time < 1300) {
      assert.ok(sample.width > initialSampleWidth);
      assert.equal(resolvedUpdates, 0);
    }
  }
  assert.equal(layoutReads, 1);
  assert.equal(resolvedUpdates, 1);
  assert.equal(frames.size, 0);
  assert.equal(calls.at(-1)[0], image);
  assert.equal(rendered.props.children[1].type, "canvas");
  resize();
  assert.equal(layoutReads, 2);
  assert.equal(resolvedUpdates, 1);
  assert.equal(calls.at(-1)[0], image);
  cleanup();
});
