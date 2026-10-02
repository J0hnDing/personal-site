import assert from "node:assert/strict";
import test from "node:test";
import { ThoughtWorld } from "../src/components/thoughtGeometry.ts";

type Body = ThoughtWorld["bodies"][number];

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function periodicDelta(a: number, b: number, period: number) {
  let delta = b - a;
  delta %= period;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function clearance(a: Body, b: Body, world: ThoughtWorld) {
  const dx = Math.abs(
    periodicDelta(a.x + a.width / 2, b.x + b.width / 2, world.width),
  );
  const dy = Math.abs(
    periodicDelta(a.y + a.height / 2, b.y + b.height / 2, world.height),
  );
  return {
    x: dx - (a.width + b.width) / 2,
    y: dy - (a.height + b.height) / 2,
  };
}

function overlaps(a: Body, b: Body, world: ThoughtWorld) {
  const gap = clearance(a, b, world);
  return gap.x < 0 && gap.y < 0;
}

test("seeded construction packs measured rectangles with a 20px gap", () => {
  const sizes = [
    { id: "meaning", width: 238, height: 32, textLength: 40 },
    { id: "consciousness", width: 214, height: 64, textLength: 40 },
    { id: "identity", width: 126, height: 32, textLength: 40 },
    { id: "ai", width: 242, height: 64, textLength: 40 },
    { id: "copy", width: 270, height: 64, textLength: 40 },
    { id: "free-will", width: 172, height: 32, textLength: 40 },
    { id: "good-evil", width: 194, height: 32, textLength: 40 },
    { id: "god", width: 148, height: 32, textLength: 40 },
  ];
  const world = new ThoughtWorld(sizes, 640, 420, seeded(0x51a7));
  const maxWidth = Math.max(...sizes.map((size) => size.width));
  const maxHeight = Math.max(...sizes.map((size) => size.height));

  assert.ok(world.width >= 640 + maxWidth * 2 + 96);
  assert.ok(world.height >= 420 + maxHeight * 2 + 96);
  assert.deepEqual(
    world.bodies.map((body) => body.id),
    sizes.map((size) => size.id),
  );
  assert.equal(new Set(world.bodies.map((body) => body.id)).size, sizes.length);
  for (let first = 0; first < world.bodies.length; first += 1) {
    for (let second = first + 1; second < world.bodies.length; second += 1) {
      const gap = clearance(world.bodies[first], world.bodies[second], world);
      assert.equal(
        overlaps(world.bodies[first], world.bodies[second], world),
        false,
      );
      assert.ok(
        gap.x >= 20 - 1e-6 || gap.y >= 20 - 1e-6,
        "packing gap is too small",
      );
    }
  }
});

test("overlapping bodies resolve on the measured collision axis and exchange velocity", () => {
  const world = new ThoughtWorld(
    [
      { id: "left", width: 40, height: 40, textLength: 40 },
      { id: "right", width: 40, height: 40, textLength: 40 },
    ],
    300,
    200,
    seeded(1),
  );
  const [left, right] = world.bodies;
  left.x = 100;
  left.y = 80;
  left.vx = 100;
  left.vy = 0;
  right.x = 150;
  right.y = 80;
  right.vx = -100;
  right.vy = 0;

  world.step(0.1);

  assert.equal(overlaps(left, right, world), false);
  assert.ok(left.vx < 0, "left body should bounce left");
  assert.ok(right.vx > 0, "right body should bounce right");
  assert.ok(left.vx < -90 && left.vx > -94);
  assert.ok(right.vx > 90 && right.vx < 94);
});

test("fixed bodies never move and reflect a moving body despite resume velocity", () => {
  const world = new ThoughtWorld(
    [
      { id: "fixed", width: 44, height: 44, textLength: 40 },
      { id: "moving", width: 36, height: 36, textLength: 40 },
    ],
    300,
    200,
    seeded(2),
  );
  const [fixed, moving] = world.bodies;
  fixed.x = 100;
  fixed.y = 78;
  // A focused body keeps its previous velocity so it can resume naturally,
  // but collision response must still treat it as an immovable zero-velocity wall.
  fixed.vx = -100;
  fixed.vy = 0;
  fixed.fixed = true;
  moving.x = 145;
  moving.y = 82;
  moving.vx = -80;
  moving.vy = 0;
  const fixedPosition = { x: fixed.x, y: fixed.y };

  world.step(0.2);

  assert.deepEqual({ x: fixed.x, y: fixed.y }, fixedPosition);
  assert.equal(fixed.fixed, true);
  assert.ok(moving.vx > 0, "moving body should reflect from the fixed body");
  assert.equal(overlaps(fixed, moving, world), false);
});

test("collision resolution works across both periodic seams", () => {
  const world = new ThoughtWorld(
    [
      { id: "seam-left", width: 40, height: 40, textLength: 40 },
      { id: "seam-right", width: 40, height: 40, textLength: 40 },
    ],
    300,
    200,
    seeded(3),
  );
  const [left, right] = world.bodies;
  left.x = world.width - 24;
  left.y = world.height - 24;
  left.vx = 30;
  left.vy = 30;
  right.x = 4;
  right.y = 4;
  right.vx = -30;
  right.vy = -30;

  world.step(0.01);

  assert.equal(overlaps(left, right, world), false);
  assert.ok(left.vx < 0 || left.vy < 0, "left seam body should bounce");
  assert.ok(right.vx > 0 || right.vy > 0, "right seam body should bounce");
});

test("a varied twelve-thought cloud stays separated through long drift and freezes", () => {
  const desktopSizes = [
    { id: "meaning", width: 540, height: 32, textLength: 40 },
    { id: "consciousness", width: 482, height: 64, textLength: 40 },
    { id: "identity", width: 262, height: 32, textLength: 40 },
    { id: "ai", width: 510, height: 64, textLength: 40 },
    { id: "copy", width: 528, height: 64, textLength: 40 },
    { id: "know", width: 206, height: 32, textLength: 40 },
    { id: "free-will", width: 276, height: 32, textLength: 40 },
    { id: "good-evil", width: 296, height: 32, textLength: 40 },
    { id: "god", width: 214, height: 32, textLength: 40 },
    { id: "originality", width: 516, height: 64, textLength: 40 },
    { id: "something", width: 474, height: 32, textLength: 40 },
    { id: "existence", width: 248, height: 32, textLength: 40 },
  ];
  const mobileSizes = desktopSizes.map((size, index) => ({
    ...size,
    width: Math.min(size.width, 292 - (index % 3) * 12),
    height: size.height + (index % 4 === 0 ? 32 : 0),
  }));

  for (const [viewportWidth, viewportHeight, sizes] of [
    [1440, 900, desktopSizes],
    [390, 844, mobileSizes],
  ] as const) {
    const world = new ThoughtWorld(
      sizes,
      viewportWidth,
      viewportHeight,
      seeded(viewportWidth),
    );
    const frozen = world.bodies[3];
    for (let tick = 0; tick < 240; tick += 1) {
      frozen.fixed = tick % 48 < 12;
      world.step(0.5);
      for (let first = 0; first < world.bodies.length; first += 1) {
        for (
          let second = first + 1;
          second < world.bodies.length;
          second += 1
        ) {
          assert.equal(
            overlaps(world.bodies[first], world.bodies[second], world),
            false,
            `${viewportWidth}px cloud overlapped at ${tick / 2}s`,
          );
        }
      }
    }
  }
});

test("positions returns one nearest copy per thought for arbitrary pans", () => {
  const world = new ThoughtWorld(
    [
      { id: "first", width: 110, height: 32, textLength: 40 },
      { id: "second", width: 140, height: 32, textLength: 40 },
      { id: "third", width: 170, height: 64, textLength: 40 },
    ],
    480,
    320,
    seeded(4),
  );
  const first = world.bodies[0];
  first.x = world.width / 2 - first.width / 2 - 40;
  first.y = world.height / 2 - first.height / 2 - 30;
  const atOrigin = world.positions(0, 0);
  const afterSmallPan = world.positions(10, 15);
  const firstAtOrigin = atOrigin.find((position) => position.id === first.id)!;
  const firstAfterPan = afterSmallPan.find(
    (position) => position.id === first.id,
  )!;

  assert.equal(atOrigin.length, world.bodies.length);
  assert.equal(
    new Set(atOrigin.map((position) => position.id)).size,
    world.bodies.length,
  );
  assert.ok(
    atOrigin.every(
      (position) => Number.isFinite(position.x) && Number.isFinite(position.y),
    ),
  );
  assert.ok(Math.abs(firstAfterPan.x - (firstAtOrigin.x - 10)) < 1e-6);
  assert.ok(Math.abs(firstAfterPan.y - (firstAtOrigin.y - 15)) < 1e-6);

  for (const [cameraX, cameraY] of [
    [world.width * 17.25, -world.height * 12.5],
    [-world.width * 101.75, world.height * 88.25],
  ]) {
    const positions = world.positions(cameraX, cameraY);
    assert.equal(positions.length, world.bodies.length);
    assert.deepEqual(
      positions.map((position) => position.id).sort(),
      world.bodies.map((body) => body.id).sort(),
    );
  }
});

test("a fast held-question drag pushes and bounces neighbours without tunnelling", () => {
  const world = new ThoughtWorld(
    [
      { id: "held", width: 40, height: 40, textLength: 40 },
      { id: "near", width: 40, height: 40, textLength: 40 },
      { id: "far", width: 40, height: 40, textLength: 40 },
    ],
    700,
    400,
    seeded(5),
  );
  const [held, near, far] = world.bodies;
  Object.assign(held, { x: 100, y: 100, vx: 9, vy: 4 });
  Object.assign(near, { x: 180, y: 100, vx: -10, vy: 0, fixed: true });
  Object.assign(far, { x: 230, y: 100, vx: -12, vy: 0 });
  world.moveBody("held", 300, 0);
  assert.ok(Math.abs(held.x - 400) < 1e-6);
  assert.equal(held.y, 100);
  assert.equal(held.vx, 9);
  assert.ok(near.x >= held.x + held.width - 1e-6);
  assert.ok(far.x >= near.x + near.width - 1e-6);
  assert.ok(near.vx > 0 && far.vx > 0);
  for (let first = 0; first < world.bodies.length; first++) {
    for (let second = first + 1; second < world.bodies.length; second++) {
      assert.equal(
        overlaps(world.bodies[first], world.bodies[second], world),
        false,
      );
    }
  }
  world.step(0.1);
  assert.ok(Math.abs(held.x - 400) < 1e-6);
  held.fixed = false;
  world.step(0.1);
  assert.ok(held.x > 400, "released text resumes its previous drift");
});

test("held-question dragging collides across a wrapping seam", () => {
  const world = new ThoughtWorld(
    [
      { id: "held", width: 40, height: 40, textLength: 40 },
      { id: "other", width: 40, height: 40, textLength: 40 },
    ],
    500,
    300,
    seeded(6),
  );
  const [held, other] = world.bodies;
  Object.assign(held, { x: world.width - 60, y: 100, vx: 8, vy: 0 });
  Object.assign(other, { x: 10, y: 100, vx: -8, vy: 0 });
  world.moveBody("held", 100, 0);
  assert.ok(Math.abs(held.x - 40) < 1e-6);
  assert.ok(other.x >= 80 - 1e-6);
  assert.ok(other.vx > 0);
  assert.equal(overlaps(held, other, world), false);
});

test("collisions conserve text-length momentum independent of rendered area", () => {
  const world = new ThoughtWorld(
    [
      { id: "large", width: 40, height: 40, textLength: 80 },
      { id: "small", width: 40, height: 40, textLength: 40 },
    ],
    700,
    400,
    seeded(7),
  );
  const [large, small] = world.bodies;
  Object.assign(large, { x: 100, y: 100, vx: 90, vy: 12 });
  Object.assign(small, { x: 130, y: 100, vx: 0, vy: 12 });
  const momentum = large.mass * large.vx;
  const energy = large.mass * large.vx ** 2;
  world.step(0.000001);
  const afterMomentum = large.mass * large.vx + small.mass * small.vx;
  const afterEnergy = large.mass * large.vx ** 2 + small.mass * small.vx ** 2;
  assert.ok(Math.abs(afterMomentum - momentum) < 1);
  assert.ok(large.vx > 31 && large.vx < 33);
  assert.ok(small.vx > 115 && small.vx < 117);
  assert.ok(afterEnergy / energy > 0.95 && afterEnergy < energy);
  assert.ok(Math.abs(large.vy - 12) < 0.001 && Math.abs(small.vy - 12) < 0.001);
  assert.equal(overlaps(large, small, world), false);
});

test("font size and wrapping do not change the mass of equal-length questions", () => {
  const collide = (width: number, height: number) => {
    const world = new ThoughtWorld(
      [
        { id: "moving", width, height, textLength: 30 },
        { id: "still", width: 40, height: 40, textLength: 30 },
      ],
      1000,
      600,
      seeded(14),
    );
    const [moving, still] = world.bodies;
    Object.assign(moving, { x: 100, y: 100, vx: 90, vy: 0 });
    Object.assign(still, { x: 100 + width - 10, y: 100, vx: 0, vy: 0 });
    world.step(0.000001);
    assert.equal(moving.mass, still.mass);
    return [moving.vx, still.vx];
  };
  const small = collide(40, 40);
  const large = collide(200, 80);
  assert.ok(Math.abs(small[0] - large[0]) < 0.0001);
  assert.ok(Math.abs(small[1] - large[1]) < 0.0001);
});

test("longer held questions transfer more momentum at the same pointer speed", () => {
  const strike = (textLength: number) => {
    const world = new ThoughtWorld(
      [
        { id: "held", width: 40, height: 40, textLength },
        { id: "hit", width: 40, height: 40, textLength: 40 },
      ],
      1000,
      600,
      seeded(15),
    );
    Object.assign(world.bodies[0], { x: 100, y: 100, vx: 0, vy: 0 });
    Object.assign(world.bodies[1], { x: 140.5, y: 100, vx: 0, vy: 0 });
    world.moveBody("held", 1, 0, 0.1);
    assert.equal(world.bodies[0].x, 101, "text must still follow the pointer");
    assert.equal(overlaps(...(world.bodies as [Body, Body]), world), false);
    return world.bodies[1].vx;
  };
  const shortImpact = strike(10);
  const longImpact = strike(80);
  assert.ok(shortImpact > 0);
  assert.ok(longImpact > shortImpact * 3);
  assert.ok(longImpact <= 180);
});

test("a dragged question transfers its pointer velocity into the question it hits", () => {
  const world = new ThoughtWorld(
    [
      { id: "held", width: 40, height: 40, textLength: 40 },
      { id: "hit", width: 40, height: 40, textLength: 40 },
    ],
    1000,
    600,
    seeded(8),
  );
  const [held, hit] = world.bodies;
  Object.assign(held, { x: 100, y: 100, vx: 9, vy: 0 });
  Object.assign(hit, { x: 150, y: 100, vx: 0, vy: 0 });
  world.moveBody("held", 20, 0, 0.1);
  assert.ok(
    hit.vx > 38 && hit.vx < 41,
    "impact must carry a softened fraction of the 200px/s pointer speed",
  );
  assert.equal(held.vx, 9, "holding preserves its stored velocity");
  const impactX = hit.x;
  world.step(0.25);
  assert.ok(
    hit.x > impactX + 9 && hit.x < impactX + 11,
    "struck text must keep coasting after contact ends",
  );
  assert.equal(overlaps(held, hit, world), false);
});

test("released questions coast with light friction independent of frame rate", () => {
  const make = () => {
    const world = new ThoughtWorld(
      [{ id: "thrown", width: 40, height: 40, textLength: 40 }],
      4000,
      2000,
      seeded(9),
    );
    Object.assign(world.bodies[0], { x: 100, y: 100, fixed: true });
    world.releaseBody("thrown", 300, 0);
    assert.equal(world.bodies[0].fixed, false);
    return world;
  };
  const fast = make();
  const slow = make();
  for (let i = 0; i < 240; i++) fast.step(1 / 120);
  for (let i = 0; i < 60; i++) slow.step(1 / 30);
  assert.ok(fast.bodies[0].vx > 35 && fast.bodies[0].vx < 40);
  assert.ok(fast.bodies[0].x > 185 && fast.bodies[0].x < 200);
  assert.ok(Math.abs(fast.bodies[0].x - slow.bodies[0].x) < 1e-7);
  assert.ok(Math.abs(fast.bodies[0].vx - slow.bodies[0].vx) < 1e-7);
});

test("fast free-moving questions cannot tunnel through one another", () => {
  const world = new ThoughtWorld(
    [
      { id: "fast", width: 40, height: 40, textLength: 40 },
      { id: "still", width: 40, height: 40, textLength: 40 },
    ],
    2000,
    1000,
    seeded(10),
  );
  const [fast, still] = world.bodies;
  Object.assign(fast, { x: 100, y: 100, vx: 5000, vy: 0 });
  Object.assign(still, { x: 150, y: 100, vx: 0, vy: 0 });
  world.step(0.1);
  assert.ok(still.vx > 160 && still.vx <= 180);
  assert.ok(fast.vx < 10);
  assert.ok(still.x > fast.x + fast.width);
  assert.equal(overlaps(fast, still, world), false);
});

test("a twelve-question cloud stays separated through repeated throws and impacts", () => {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const world = new ThoughtWorld(
      Array.from({ length: 12 }, (_, i) => ({
        id: String(i),
        width: Math.min(width * 0.75, 180 + i * 25),
        height: 40 + (i % 3) * 20,
        textLength: 10 + i * 5,
      })),
      width,
      height,
      seeded(width + 11),
    );
    for (let tick = 0; tick < 1800; tick++) {
      if (tick % 180 === 0) {
        const id = String((tick / 180) % 12);
        world.moveBody(id, 150, 80, 0.15);
        world.releaseBody(id, 800, 300);
      }
      world.step(1 / 60);
      for (const body of world.bodies) {
        assert.ok(Math.hypot(body.vx, body.vy) <= 180 + 1e-9);
      }
      for (let i = 0; i < world.bodies.length; i++) {
        for (let j = i + 1; j < world.bodies.length; j++) {
          const gap = clearance(world.bodies[i], world.bodies[j], world);
          assert.ok(
            gap.x >= -0.001 || gap.y >= -0.001,
            `${width}px impact cloud overlaps at tick ${tick}`,
          );
        }
      }
    }
  }
});

test("diagonal launches obey a total speed limit and retain their direction", () => {
  const world = new ThoughtWorld(
    [{ id: "thrown", width: 40, height: 40, textLength: 40 }],
    1000,
    600,
    seeded(12),
  );
  world.releaseBody("thrown", 1200, -1200);
  const body = world.bodies[0];
  assert.ok(Math.abs(Math.hypot(body.vx, body.vy) - 180) < 1e-9);
  assert.ok(Math.abs(body.vx + body.vy) < 1e-9);
  const initialSpeed = Math.hypot(body.vx, body.vy);
  world.step(1);
  const speed = Math.hypot(body.vx, body.vy);
  assert.ok(speed > 125 && speed < 140 && speed < initialSpeed);
});

test("collision amplification and fast dragged contacts obey the speed limit", () => {
  const world = new ThoughtWorld(
    [
      { id: "large", width: 200, height: 40, textLength: 100 },
      { id: "small", width: 40, height: 40, textLength: 20 },
    ],
    1000,
    600,
    seeded(13),
  );
  const [large, small] = world.bodies;
  Object.assign(large, { x: 100, y: 100, vx: 170, vy: 0 });
  Object.assign(small, { x: 290, y: 100, vx: 0, vy: 0 });
  world.step(0.000001);
  assert.ok(small.vx > 175 && small.vx <= 180);
  assert.ok(Math.hypot(large.vx, large.vy) <= 180);
  Object.assign(large, { x: 100, y: 100, vx: 0, vy: 0 });
  Object.assign(small, { x: 310, y: 100, vx: 0, vy: 0 });
  world.moveBody("large", 20, 0, 0.01);
  assert.ok(small.vx > 175 && small.vx <= 180);
  assert.equal(overlaps(large, small, world), false);
});
