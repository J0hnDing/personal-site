import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const javascript = ts.transpileModule(
  readFileSync(
    new URL("../src/components/SmoothScroll.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;

function mount() {
  const sections = [
    { top: 0, offsetHeight: 1800 },
    { top: 1800, offsetHeight: 1000 },
    { top: 2800, offsetHeight: 1000 },
  ];
  let now = 0;
  let reads = 0;
  let lenis;
  let cleanup;
  let resize;
  let resizeFrame;
  class Lenis {
    targetScroll = 0;
    isStopped = false;
    constructor(options) {
      this.options = options;
      lenis = this;
    }
    scrollTo(position) {
      this.targetScroll = position;
    }
    destroy() {}
  }
  const exports = {};
  vm.runInNewContext(javascript, {
    exports,
    require: (name) => {
      if (name === "react")
        return { useEffect: (effect) => (cleanup = effect()) };
      if (name === "react-router-dom")
        return { useLocation: () => ({ pathname: "/" }) };
      if (name === "lenis") return Lenis;
      if (name === "lenis/dist/lenis.css") return {};
      if (name === "./scrollController")
        return {
          homeSectionTop: (section) => {
            reads += 1;
            return section.top;
          },
          mountScrollController: () => () => {},
        };
      throw new Error(`Unexpected import: ${name}`);
    },
    document: { querySelectorAll: () => sections },
    window: {
      innerHeight: 1000,
      addEventListener() {},
      removeEventListener() {},
      cancelAnimationFrame() {},
      requestAnimationFrame: (callback) => {
        resizeFrame = callback;
        return 1;
      },
    },
    performance: { now: () => now },
    Element: class {},
    ResizeObserver: class {
      constructor(callback) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    },
  });
  exports.default({ disabled: false });
  return {
    sections,
    lenis,
    cleanup: () => cleanup(),
    reads: () => reads,
    resize: () => {
      resize();
      resizeFrame();
    },
    input(deltaY, time, type = "wheel") {
      now = time;
      let prevented = false;
      const data = {
        deltaY,
        event: {
          type,
          cancelable: true,
          preventDefault: () => (prevented = true),
        },
      };
      const accepted = lenis.options.virtualScroll(data);
      if (accepted) lenis.targetScroll += data.deltaY;
      return { accepted, prevented };
    },
  };
}

test("forward input retains the intended hero and Introduction pauses", () => {
  const page = mount();
  page.input(1200, 0);
  assert.equal(page.lenis.targetScroll, 800);
  assert.equal(page.input(300, 10).accepted, false);
  assert.equal(page.input(300, 501).accepted, true);
  assert.equal(page.lenis.targetScroll, 1100);
  page.input(1000, 520);
  assert.equal(page.lenis.targetScroll, 1800);
  assert.deepEqual(page.input(300, 530), {
    accepted: false,
    prevented: true,
  });
  assert.equal(page.input(300, 1021).accepted, true);
  page.cleanup();
});

test("reverse input releases immediately and retains the aligned hero stop", () => {
  const page = mount();
  page.lenis.targetScroll = 1500;
  page.input(500, 0);
  assert.equal(page.lenis.targetScroll, 1800);
  assert.equal(page.input(-200, 10).accepted, true);
  assert.equal(page.lenis.targetScroll, 1600);
  page.input(-1200, 20);
  assert.equal(page.lenis.targetScroll, 800);
  assert.equal(page.input(-200, 30).accepted, false);
  assert.equal(page.input(-200, 521).accepted, true);
  page.cleanup();
});

test("touch gestures retain the pause and resume with the next gesture", () => {
  const page = mount();
  page.input(1200, 0, "touchmove");
  assert.equal(page.lenis.targetScroll, 800);
  assert.equal(page.input(0, 10, "touchstart").accepted, true);
  assert.equal(page.input(300, 20, "touchmove").accepted, false);
  assert.equal(page.input(0, 510, "touchstart").accepted, true);
  assert.equal(page.input(300, 520, "touchmove").accepted, true);
  assert.equal(page.lenis.targetScroll, 1100);
  page.cleanup();
});

test("input uses cached geometry and resize updates and realigns the boundary", () => {
  const page = mount();
  const initialReads = page.reads();
  page.input(100, 0);
  page.input(100, 10);
  assert.equal(page.reads(), initialReads);
  page.sections[0].offsetHeight = 2000;
  page.sections[1].top = 2000;
  page.sections[2].top = 3000;
  page.resize();
  assert.ok(page.reads() > initialReads);
  page.input(1200, 20);
  assert.equal(page.lenis.targetScroll, 1000);
  page.sections[0].offsetHeight = 2200;
  page.sections[1].top = 2200;
  page.sections[2].top = 3200;
  page.resize();
  assert.equal(page.lenis.targetScroll, 1200);
  page.cleanup();
});
