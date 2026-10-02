import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./galleryGeometry.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { createLayout, dimensionsAtScale, GalleryWorld, newConcaveCorners, cornerRays, cornerMargins, cornerSegmentLengths } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("random dimensions use a ratio-specific minimum side of 70px", () => {
  const layout = createLayout(921, 900);
  assert.equal(layout.minimum, 70);
  assert.equal(layout.minScale, 70);
  for (const ratio of layout.ratios) {
    const scale = layout.minimum * Math.sqrt(Math.max(ratio, 1 / ratio));
    const { width, height } = dimensionsAtScale(scale, ratio);
    assert.ok(width >= 70 - 0.001 && height >= 70 - 0.001);
    assert.ok(Math.abs(Math.min(width, height) - 70) < 0.001);
  }
  assert.equal(dimensionsAtScale(layout.minScale, 1).width, 70);
  assert.equal(createLayout(600, 900).minimum, 70);
});

test("corner rays stop at the maximum dimension and corner margins measure both edge segments", () => {
  const corner = { x: 0, y: 100, dx: -1, dy: -1 };
  const parent = { x: 0, y: 0, width: 100, height: 100 };
  const adjacent = { x: -200, y: 100, width: 200, height: 100 };
  assert.deepEqual(cornerSegmentLengths(corner, [parent, adjacent]), {
    horizontal: 200, vertical: 100,
  });
  const blocker = { x: -120, y: 90, width: 20, height: 10 };
  assert.equal(cornerRays(corner, [blocker], 70, 90)[0].distance, null);
  assert.equal(cornerRays(corner, [blocker], 70, 100)[0].distance, 100);
});

test("attachment checks only newly formed concave corners", () => {
  const parent = { x: 0, y: 0, width: 100, height: 100 };
  const adjacent = { x: -100, y: 100, width: 100, height: 100 };
  const candidate = { x: 0, y: 100, width: 100, height: 100 };
  assert.deepEqual(newConcaveCorners(candidate, [parent, adjacent]), [
    { x: 0, y: 100, dx: -1, dy: -1 },
  ]);
  assert.deepEqual(newConcaveCorners({ x: 0, y: -100, width: 100, height: 100 }, [parent]), []);
});

test("both outward rays start one pixel inside the empty quadrant", () => {
  const corner = { x: 0, y: 100, dx: -1, dy: -1 };
  const parent = { x: 0, y: 0, width: 100, height: 100 };
  const adjacent = { x: -100, y: 100, width: 100, height: 100 };
  const candidate = { x: 0, y: 100, width: 100, height: 100 };
  const clear = cornerRays(corner, [parent, adjacent, candidate], 112);
  assert.deepEqual(clear.map(({ origin, direction, distance, invalid }) => ({
    origin, direction, distance, invalid,
  })), [
    { origin: { x: 0, y: 99 }, direction: { dx: -1, dy: 0 }, distance: null, invalid: false },
    { origin: { x: -1, y: 100 }, direction: { dx: 0, dy: -1 }, distance: null, invalid: false },
  ]);
  const blocked = cornerRays(corner, [
    parent, adjacent, candidate,
    { x: -80, y: 90, width: 20, height: 10 },
    { x: -2, y: 50, width: 2, height: 20 },
  ], 112);
  assert.deepEqual(blocked.map(({ distance, invalid }) => ({ distance, invalid })), [
    { distance: 60, invalid: true },
    { distance: 30, invalid: true },
  ]);
  const boundary = cornerRays(corner, [
    { x: -130, y: 90, width: 18, height: 10 },
  ], 112);
  assert.equal(boundary[0].distance, 112);
  assert.equal(boundary[0].invalid, false);
});

test("corner margins distinguish protrusion, recess, flush contact, and the minimum boundary", () => {
  const other = { x: 0, y: 0, width: 200, height: 100 };
  const atStart = { x: 0, y: 100, dx: -1, dy: -1 };
  const margin = (candidate, corner) => cornerMargins(corner, candidate, [other])[0]?.margin;
  assert.equal(margin({ x: -40, y: 100, width: 240, height: 100 }, atStart), 40);
  assert.equal(margin({ x: 40, y: 100, width: 160, height: 100 }, { ...atStart, x: 40 }), -40);
  assert.equal(margin({ x: 0, y: 100, width: 200, height: 100 }, atStart), 0);
  assert.equal(margin({ x: -112, y: 100, width: 312, height: 100 }, atStart), 112);
  assert.equal(margin({ x: 112, y: 100, width: 200, height: 100 }, { ...atStart, x: 112 }), -112);

  const verticalOther = { x: 0, y: 0, width: 100, height: 200 };
  assert.equal(cornerMargins(
    { x: 0, y: 0, dx: 1, dy: -1 },
    { x: -100, y: -40, width: 100, height: 240 },
    [verticalOther],
  )[0]?.margin, 40);
  assert.equal(cornerMargins(
    { x: 0, y: 40, dx: -1, dy: -1 },
    { x: -100, y: 40, width: 100, height: 160 },
    [verticalOther],
  )[0]?.margin, -40);
  assert.deepEqual(cornerMargins(
    { x: 0, y: 100, dx: -1, dy: -1 },
    { x: 0, y: 100, width: 100, height: 100 },
    [{ x: 50, y: 0, width: 100, height: 100 }],
  ), [], "a rectangle that touches elsewhere on the side does not define this corner");
});
const photos = [
  [3, 2], [2, 3], [1, 1], [4, 5], [5, 4], [7, 5], [5, 7],
].map(([width, height], index) => ({
  id: `photo-${index}`, src: `photo-${index}.webp`, width, height,
}));

test("debug events retain the full trace of only the current parent", () => {
  const world = new GalleryWorld([], createLayout(921, 900), 8);
  assert.equal(world.processNext(), true);
  assert.equal(world.debugEvents[0].event, "parent-processing-start");
  assert.equal(world.debugEvents.at(-1).event, "parent-filled");
  assert.equal(world.debugEvents[0].parent.id, 0);

  world.processNext();
  assert.equal(world.debugEvents[0].event, "parent-processing-start");
  assert.equal(world.debugEvents[0].parent.id, 1);
  assert.equal(world.debugEvents[0].sequence, 1);
  assert.ok(world.debugEvents.every((event, index) => event.sequence === index + 1));
  assert.ok(["parent-filled", "parent-stalled"].includes(world.debugEvents.at(-1).event));
});

test("final corner fallback uses fresh ray dimensions and checks only collision", () => {
  const makeWorld = (blocked) => {
    const world = new GalleryWorld([], createLayout(921, 900), 160276669);
    const root = world.cells[0];
    const parent = world.add({ x: 100, y: 281.6676239116158, width: 190.842523425899,
      height: 152.6740187407192 }, root, null);
    world.add({ x: 290.842523425899, y: 281.6676239116158, width: 79.46515563501752,
      height: 238.3954669050526 }, root, null);
    world.add({ x: 100, y: 434.341642652335, width: 105.2557973391056,
      height: 157.88369600865838 }, root, null);
    world.add({ x: 100, y: 592.2253386609934, width: 353.5511055438081,
      height: 441.93888192976016 }, root, null);
    if (blocked) world.add({ x: 220, y: 500, width: 20, height: 20 }, root, null);
    const corner = world.corners(parent).find((anchor) =>
      Math.abs(anchor.x - 290.842523425899) < 0.001 &&
      Math.abs(anchor.y - 434.341642652335) < 0.001);
    assert.ok(corner);
    return { world, parent, corner };
  };

  const { world, parent, corner } = makeWorld(false);
  const result = world.candidateForCorner(parent, corner);
  assert.ok(result.candidate);
  assert.equal(result.candidate.placementSource, "corner-ray-bounds");
  assert.ok(Math.abs(result.candidate.rect.width - 85.58672608679342) < 0.001);
  assert.ok(Math.abs(result.candidate.rect.height - 157.88369600865843) < 0.001);
  assert.ok(Math.sqrt(result.candidate.rect.width * result.candidate.rect.height) < 70 * Math.sqrt(3));
  const fallbackIndex = world.debugEvents.findIndex((event) =>
    event.event === "corner-fallback-choice" && event.stage === "ray-bounds");
  assert.ok(fallbackIndex >= 0);
  assert.deepEqual(world.debugEvents.slice(fallbackIndex + 1).map((event) => event.event), ["candidate-accepted"]);
  assert.equal(world.withinScale(40, 40, 100, 100), false);
  assert.ok(world.candidateAt(parent, "bottom", 40, 40,
    world.cornerPosition(corner, 40, 40, "collision-only-check"), null, true));
  world.add(result.candidate.rect, parent, null);
  assert.deepEqual(world.freeIntervals(parent, "bottom"), []);

  assert.ok(world.candidateAt(parent, "bottom", 40, 40,
    world.cornerPosition(corner, 40, 40, "collision-only-check"), null, true) === null,
  "the fallback still rejects a rectangle that overlaps the one just placed");

  const blocked = makeWorld(true);
  assert.equal(blocked.world.candidateForCorner(blocked.parent, blocked.corner).candidate, null);
  assert.match(blocked.world.debugEvents.at(-2).reason, /^overlaps-rectangle-/);
  assert.equal(blocked.world.debugEvents.at(-1).event, "corner-attachment-error");
});

test("corners cache rays for priority but use fresh rays for attachment bounds", () => {
  const world = new GalleryWorld([], createLayout(921, 900), 16);
  world.processNext();
  const seen = new Map();
  let mixedQueue = false;
  let refreshedRay = false;
  for (const event of world.debugEvents) {
    if (event.event === "corner-queue-initialized" || event.event === "corner-queue-updated") {
      const queue = event.queued;
      mixedQueue ||= queue.some((corner) => corner.blockedDirections > 0);
      for (let index = 0; index < queue.length; index++) {
        const corner = queue[index];
        assert.equal(corner.blockedDirections, corner.rays.filter((ray) => ray.distance !== null).length);
        if (index) assert.ok(queue[index - 1].blockedDirections <= corner.blockedDirections);
        const key = JSON.stringify([corner.parentId, corner.x, corner.y, corner.dx, corner.dy, corner.side]);
        if (seen.has(key)) assert.deepEqual(corner.rays, seen.get(key));
        else seen.set(key, corner.rays);
      }
    }
    if (event.event === "corner-parameter-bounds") {
      refreshedRay ||= event.rays.some((ray, index) => ray.distance !== event.corner.rays[index].distance);
      assert.equal(event.rayWidth, event.rays[0].distance ?? world.layout.maxDimension);
      assert.equal(event.rayHeight, event.rays[1].distance ?? world.layout.maxDimension);
    }
  }
  assert.ok(mixedQueue);
  assert.ok(refreshedRay);
});

test("corner parameter choices are filtered by both outward ray distances", () => {
  const world = new GalleryWorld([], createLayout(921, 900), 8);
  for (let index = 0; index < 3 && world.pending; index++) world.processNext();
  const bounds = new Map();
  let choices = 0;
  for (const event of world.debugEvents) {
    if (event.event === "corner-parameter-bounds") bounds.set(JSON.stringify(event.corner), event);
    if (event.event !== "corner-parameter-choice") continue;
    const limit = bounds.get(JSON.stringify(event.corner));
    assert.ok(limit);
    assert.ok(event.attempt >= 1 && event.attempt <= 25);
    assert.ok(event.width <= limit.rayWidth + 0.001);
    assert.ok(event.height <= limit.rayHeight + 0.001);
    choices++;
  }
  assert.ok(choices > 0);
});

test("a processed parent has all four sides covered, including short gaps", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const world = new GalleryWorld(photos, createLayout(1920, 953), seed);
    if (!world.processNext()) {
      assert.equal(world.stalledParentId, 0);
      assert.equal(world.isFilled(world.cells[0]), false);
      continue;
    }
    const firstGeneration = world.cells.length;
    while (world.processed < firstGeneration) {
      const advanced = world.processNext();
      if (!advanced) {
        assert.equal(world.stalledParentId, world.processed);
        assert.equal(world.isFilled(world.cells[world.processed]), false);
        break;
      }
    }
    for (let index = 0; index < world.processed; index++) {
      const coverage = world.sideCoverage(world.cells[index]);
      assert.equal(coverage.length, 4);
      for (const side of coverage) {
        assert.equal(side.free.length, 0, `seed ${seed}, parent ${index}, ${side.side} remains exposed`);
        assert.ok(Math.abs(side.covered - side.length) < 0.001);
      }
    }
  }
});

test("attachments may extend beyond the parent side without overlapping", () => {
  let overhangs = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const world = new GalleryWorld(photos, createLayout(1920, 953), seed);
    world.processNext();
    const parent = world.cells[0];
    for (const child of world.cells.slice(1)) {
      if (Math.abs(child.y + child.height - parent.y) < 0.001 || Math.abs(child.y - parent.y - parent.height) < 0.001) {
        if (child.x < parent.x - 0.001 || child.x + child.width > parent.x + parent.width + 0.001) overhangs++;
      } else if (child.y < parent.y - 0.001 || child.y + child.height > parent.y + parent.height + 0.001) overhangs++;
      assert.equal(world.query({
        x: child.x + 0.01, y: child.y + 0.01,
        width: child.width - 0.02, height: child.height - 0.02,
      }).length, 1, `seed ${seed} has an overlap`);
    }
  }
  assert.ok(overhangs > 0);
});
