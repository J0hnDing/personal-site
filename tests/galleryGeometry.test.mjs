import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/components/galleryGeometry.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(`${source}\nexport { chunkTiles };`, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { createLayout, GalleryWorld, chunkTiles, selectVisiblePhotos } =
  await import(
    `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
  );
const photos = [
  [3, 2],
  [2, 3],
  [1, 1],
  [4, 5],
  [5, 4],
].map(([width, height], index) => ({
  id: `photo-${index}`,
  src: `photo-${index}.webp`,
  width,
  height,
}));
const EPS = 0.00001;

// Check every horizontal slab induced by real rectangle edges. Its sorted x
// intervals must cover the whole view exactly once, including chunk boundaries.
function assertTiled(cells, view) {
  const right = view.x + view.width;
  const bottom = view.y + view.height;
  const cuts = [
    ...new Set([
      view.y,
      bottom,
      ...cells.flatMap((cell) => [cell.y, cell.y + cell.height]),
    ]),
  ]
    .filter((y) => y >= view.y && y <= bottom)
    .sort((a, b) => a - b);
  for (let index = 1; index < cuts.length; index++) {
    if (cuts[index] - cuts[index - 1] < EPS) continue;
    const y = (cuts[index] + cuts[index - 1]) / 2;
    const intervals = cells
      .filter((cell) => cell.y < y && cell.y + cell.height > y)
      .map((cell) => [
        Math.max(view.x, cell.x),
        Math.min(right, cell.x + cell.width),
      ])
      .filter(([start, end]) => end - start > EPS)
      .sort((a, b) => a[0] - b[0]);
    let cursor = view.x;
    for (const [start, end] of intervals) {
      assert.ok(
        Math.abs(start - cursor) < EPS,
        `${start > cursor ? "hole" : "overlap"} at ${cursor},${y}`,
      );
      cursor = end;
    }
    assert.ok(Math.abs(cursor - right) < EPS, `uncovered slab at y=${y}`);
  }
}

function normalized(cells) {
  return cells
    .map(({ id: _id, ...cell }) => cell)
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

for (const [width, height] of [
  [1920, 953],
  [390, 844],
]) {
  test(`complete tiling and minimum dimensions across seeds at ${width}x${height}`, () => {
    const layout = createLayout(width, height);
    assert.ok(Math.abs(layout.minimum - (width < 700 ? 89.6 : 112)) < EPS);
    for (const seed of [0, 1, 2, 3, 42, 4135253260, 0xffffffff]) {
      const world = new GalleryWorld(photos, layout, seed);
      for (const view of [
        { x: -width / 2, y: -height / 2, width, height },
        { x: 811, y: -1733, width, height },
        { x: -2100, y: 1700, width, height },
      ]) {
        world.ensureCoverage(view);
        assertTiled(world.query(view), view);
        const buffer = {
          x: view.x - 300,
          y: view.y - 300,
          width: width + 600,
          height: height + 600,
        };
        assertTiled(world.query(buffer), buffer);
      }
      for (const cell of world.cells) {
        assert.ok(
          cell.width >= layout.minimum - EPS &&
            cell.height >= layout.minimum - EPS,
        );
        assert.ok(
          cell.width <= layout.minimum * 6.6 + EPS &&
            cell.height <= layout.minimum * 6.6 + EPS,
        );
        if (cell.photo)
          assert.ok(photos.includes(cell.photo), "invented photograph");
      }
      assert.ok(
        world.cells.some((cell) => cell.photo),
        "no real photos placed",
      );
    }
  });
}

test("distant views generate directly, preserve old rectangles, and revisit without duplicates", () => {
  const world = new GalleryWorld(photos, createLayout(1920, 953), 42);
  const opening = { x: -960, y: -476, width: 1920, height: 953 };
  world.ensureCoverage(opening);
  const snapshot = structuredClone(world.cells);
  const startingCount = world.cells.length;
  for (const view of [
    { x: 1e9, y: -1e9, width: 1920, height: 953 },
    { x: -1e9, y: 1e9, width: 1920, height: 953 },
  ]) {
    const before = world.cells.length;
    world.ensureCoverage(view);
    assert.ok(
      world.cells.length - before < 1000,
      "generated intervening space",
    );
    assertTiled(world.query(view), view);
  }
  assert.ok(world.cells.length > startingCount);
  assert.deepEqual(world.cells.slice(0, snapshot.length), snapshot);
  const count = world.cells.length;
  assert.equal(world.ensureCoverage(opening), 0);
  assert.equal(world.cells.length, count);
  assertTiled(world.query(opening), opening);
  assert.equal(
    new Set(world.cells.map((cell) => cell.id)).size,
    world.cells.length,
  );
});

test("seeded geometry and photographs are independent of exploration order", () => {
  const views = [
    { x: -1500, y: -900, width: 3000, height: 1800 },
    { x: 2000, y: 3000, width: 1200, height: 1000 },
  ];
  const first = new GalleryWorld(photos, createLayout(1920, 953), 17);
  const second = new GalleryWorld(photos, createLayout(1920, 953), 17);
  for (const view of views) first.ensureCoverage(view);
  for (const view of [...views].reverse()) second.ensureCoverage(view);
  assert.deepEqual(normalized(first.cells), normalized(second.cells));
  const different = new GalleryWorld(photos, first.layout, 18);
  different.ensureCoverage(views[0]);
  assert.notDeepEqual(
    normalized(first.query(views[0])),
    normalized(different.query(views[0])),
  );
  assert.ok(
    new Set(first.cells.map((cell) => cell.width.toFixed(4))).size > 20,
  );
});

test("all collinear edge runs terminate within the declared finite bound", () => {
  for (const seed of [0, 42, 4135253260]) {
    const world = new GalleryWorld([], createLayout(1920, 953), seed);
    const view = { x: -4200, y: -4200, width: 8400, height: 8400 };
    world.ensureCoverage(view);
    const cells = world.query(view);
    assertTiled(cells, view);
    for (const horizontal of [true, false]) {
      const edges = new Map();
      for (const cell of cells) {
        const fixed = horizontal
          ? [cell.y, cell.y + cell.height]
          : [cell.x, cell.x + cell.width];
        const start = horizontal ? cell.x : cell.y;
        const end = horizontal ? cell.x + cell.width : cell.y + cell.height;
        for (const coordinate of fixed) {
          if (coordinate <= -4200 || coordinate >= 4200) continue;
          const key = coordinate.toFixed(5);
          if (!edges.has(key)) edges.set(key, []);
          edges.get(key).push([Math.max(-4200, start), Math.min(4200, end)]);
        }
      }
      for (const intervals of edges.values()) {
        intervals.sort((a, b) => a[0] - b[0]);
        let start = intervals[0][0];
        let end = intervals[0][1];
        for (const [nextStart, nextEnd] of intervals.slice(1)) {
          if (nextStart <= end + EPS) end = Math.max(end, nextEnd);
          else {
            assert.ok(
              end - start <= world.maxStraightLength + EPS,
              "unbroken seam exceeds bound",
            );
            start = nextStart;
            end = nextEnd;
          }
        }
        assert.ok(
          end - start <= world.maxStraightLength + EPS,
          "unbroken seam exceeds bound",
        );
      }
    }
  }
});

test("degenerate random sources retain a complete minimum-sized fallback tiling", () => {
  for (const value of [0, 0.5, 0.999999]) {
    const tiles = chunkTiles(() => value);
    const incoming = [
      { x: -1, y: 4, width: 2, height: 1 },
      { x: 4, y: -1, width: 1, height: 2 },
    ];
    assertTiled([...tiles, ...incoming], { x: 0, y: 0, width: 9, height: 9 });
    for (let cut = 1; cut <= 9; cut++) {
      assert.ok(
        tiles.some((tile) => tile.x < cut && tile.x + tile.width > cut),
        `vertical seam ${cut}`,
      );
      assert.ok(
        tiles.some((tile) => tile.y < cut && tile.y + tile.height > cut),
        `horizontal seam ${cut}`,
      );
    }
  }
});

test("empty/invalid photo lists still tile and invalid dimensions fail clearly", () => {
  const world = new GalleryWorld(
    [{ id: "bad", src: "bad", width: NaN, height: 1 }],
    createLayout(390, 844),
    1,
  );
  const view = { x: -500, y: -500, width: 1000, height: 1000 };
  world.ensureCoverage(view);
  assertTiled(world.query(view), view);
  assert.ok(world.cells.every((cell) => cell.photo === null));
  assert.throws(
    () => new GalleryWorld([], { minimum: 0, maxZoom: 1 }),
    RangeError,
  );
  assert.throws(
    () => world.ensureCoverage({ ...view, x: Infinity }),
    RangeError,
  );
  assert.throws(() => world.query({ ...view, width: -1 }), RangeError);
  assert.throws(() => world.ensureCoverage({ ...view, width: -1 }), RangeError);
  assert.throws(
    () => world.query({ ...view, x: Number.MAX_VALUE }),
    RangeError,
  );
  assert.deepEqual(world.query({ ...view, width: 0 }), []);
});

const collection = Array.from({ length: 48 }, (_, index) => ({
  id: `collection-${index}`,
  src: `collection-${index}.webp`,
  width: index % 3 === 0 ? 2 : index % 3 === 1 ? 3 : 1,
  height: index % 3 === 0 ? 3 : index % 3 === 1 ? 2 : 1,
}));

test("larger photos preserve aspect ratio and have similar, immutable displayed areas", () => {
  for (const viewportWidth of [1920, 390]) {
    const layout = createLayout(viewportWidth, 844);
    const world = new GalleryWorld(collection, layout, 42);
    world.ensureCoverage({ x: -4500, y: -4500, width: 9000, height: 9000 });
    const frames = world.cells.filter((cell) => cell.photo);
    assert.ok(frames.length > 30, "photo placement became too sparse");
    const areas = [];
    const sizes = new Map();
    for (const cell of frames) {
      const frame = cell.photoFrame;
      assert.ok(frame.x >= cell.x - EPS && frame.y >= cell.y - EPS);
      assert.ok(frame.x + frame.width <= cell.x + cell.width + EPS);
      assert.ok(frame.y + frame.height <= cell.y + cell.height + EPS);
      assert.ok(
        Math.abs(
          frame.width / frame.height - cell.photo.width / cell.photo.height,
        ) < EPS,
      );
      assert.ok(
        Math.abs(frame.x + frame.width / 2 - cell.x - cell.width / 2) < EPS,
      );
      const area = frame.width * frame.height;
      assert.ok(area >= (layout.minimum * 2.2 * 0.94) ** 2 - EPS);
      areas.push(area);
      const size = [frame.width, frame.height];
      if (sizes.has(cell.photo.src))
        assert.deepEqual(size, sizes.get(cell.photo.src));
      sizes.set(cell.photo.src, size);
    }
    assert.ok(
      Math.max(...areas) / Math.min(...areas) < 1.28,
      "photo areas vary too much",
    );
    assert.equal(
      sizes.size,
      collection.length,
      "the placement ignores part of the collection",
    );
  }
});

test("repeat photos stay far apart and normal desktop/mobile views have no duplicates", () => {
  for (const [width, height] of [
    [1920, 1080],
    [390, 844],
  ]) {
    for (const seed of [0, 1, 42]) {
      const layout = createLayout(width, height);
      const world = new GalleryWorld(collection, layout, seed);
      for (let index = 0; index < 12; index++) {
        const view = {
          x: -4200 + index * 737,
          y: -2700 + (index % 4) * 911,
          width: width / 0.72,
          height: height / 0.72,
        };
        world.ensureCoverage(view);
        const inView = world
          .query(view)
          .filter(
            (cell) =>
              cell.photo &&
              cell.photoFrame.x < view.x + view.width &&
              cell.photoFrame.x + cell.photoFrame.width > view.x &&
              cell.photoFrame.y < view.y + view.height &&
              cell.photoFrame.y + cell.photoFrame.height > view.y,
          );
        assert.equal(
          new Set(inView.map((cell) => cell.photo.src)).size,
          inView.length,
        );
      }
      const placed = world.cells.filter((cell) => cell.photo);
      let repeats = 0;
      for (let a = 0; a < placed.length; a++)
        for (let b = a + 1; b < placed.length; b++) {
          if (placed[a].photo.src !== placed[b].photo.src) continue;
          repeats++;
          const first = placed[a].photoFrame;
          const second = placed[b].photoFrame;
          const gapX = Math.max(
            0,
            first.x - second.x - second.width,
            second.x - first.x - first.width,
          );
          const gapY = Math.max(
            0,
            first.y - second.y - second.height,
            second.y - first.y - first.height,
          );
          assert.ok(
            Math.max(gapX, gapY) >= layout.minimum * 27 - EPS,
            "repeat photographs are too close",
          );
        }
      assert.ok(
        repeats > 0,
        "the repeat-distance check did not exercise repeats",
      );
    }
  }
});

test("zoomed-out visibility suppresses repeated photos without changing cached geometry", () => {
  const duplicate = { ...photos[0], id: "another-id-for-same-source" };
  const world = new GalleryWorld(
    [photos[0], duplicate],
    createLayout(1920, 1080),
    42,
  );
  const view = { x: -9000, y: -9000, width: 18000, height: 18000 };
  world.ensureCoverage(view);
  const candidates = world.query(view);
  assert.ok(candidates.filter((cell) => cell.photo).length > 1);
  const snapshot = structuredClone(world.cells);
  const visible = selectVisiblePhotos(candidates, view);
  assert.equal(visible.filter((cell) => cell.photo).length, 1);
  assertTiled(visible, view);
  assert.deepEqual(world.cells, snapshot);
});

test("the duplicate guard prioritizes a visible image over a closer buffered image", () => {
  const make = (id, frame) => ({
    ...frame,
    id,
    photo: photos[0],
    photoFrame: frame,
  });
  const buffered = make(0, { x: 45, y: -2, width: 10, height: 1 });
  const onScreen = make(1, { x: 90, y: 90, width: 10, height: 10 });
  const visible = selectVisiblePhotos([buffered, onScreen], {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  assert.equal(visible[0].photo, null);
  assert.equal(visible[1].photo, photos[0]);
});
