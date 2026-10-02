import assert from "node:assert/strict";
import test from "node:test";
import {
  ThoughtCamera,
  edgePanSpeed,
  stepThoughtScene,
} from "../src/components/thoughtCamera.ts";
import { ThoughtWorld } from "../src/components/thoughtGeometry.ts";

test("coasting preserves release direction and smoothly settles", () => {
  const camera = new ThoughtCamera();
  camera.release(-500, 250);
  camera.step(0.1);
  assert.ok(camera.x < 0 && camera.y > 0);
  assert.ok(Math.abs(camera.velocityX) < 500 && camera.velocityX < 0);
  for (let i = 0; i < 120; i++) camera.step(1 / 30);
  assert.equal(camera.velocityX, 0);
  assert.equal(camera.velocityY, 0);
  assert.ok(Math.abs(camera.x + 190) < 0.1);
  assert.ok(Math.abs(camera.y - 95) < 0.1);
});

test("momentum travel is consistent across different frame rates", () => {
  const fast = new ThoughtCamera();
  const slow = new ThoughtCamera();
  fast.release(400, -200);
  slow.release(400, -200);
  for (let i = 0; i < 120; i++) fast.step(1 / 120);
  for (let i = 0; i < 30; i++) slow.step(1 / 30);
  assert.ok(Math.abs(fast.x - slow.x) < 1e-8);
  assert.ok(Math.abs(fast.y - slow.y) < 1e-8);
});

test("edge panning is subtle, directional, and absent in the center", () => {
  assert.equal(edgePanSpeed(960, 1920), 0);
  assert.equal(edgePanSpeed(480, 1920), 0);
  assert.ok(edgePanSpeed(300, 1920) < 0);
  assert.equal(edgePanSpeed(-1, 1920), 0);
  assert.equal(edgePanSpeed(1921, 1920), 0);
  assert.equal(edgePanSpeed(0, 1920), -120);
  assert.equal(edgePanSpeed(1920, 1920), 120);
  assert.ok(edgePanSpeed(1600, 1920) > 0 && edgePanSpeed(1600, 1920) < 120);
  const camera = new ThoughtCamera();
  camera.step(0.1, 120, -120);
  assert.equal(camera.x, 12);
  assert.equal(camera.y, -12);
});

test("holding the pointer at the same edge position pans at constant speed", () => {
  const camera = new ThoughtCamera();
  const speed = edgePanSpeed(1600, 1920);
  camera.step(0.5, speed);
  const firstMovement = camera.x;
  camera.step(0.5, speed);
  assert.equal(camera.x - firstMovement, firstMovement);
  camera.step(0.5);
  assert.equal(camera.x, firstMovement * 2);
});

test("hover pins only its text while momentum and other text keep moving", () => {
  const world = new ThoughtWorld(
    [
      { id: "hovered", width: 100, height: 40, textLength: 40 },
      { id: "other", width: 100, height: 40, textLength: 40 },
    ],
    1000,
    600,
    () => 0.5,
  );
  const [hovered, other] = world.bodies;
  Object.assign(hovered, { x: 100, y: 100, vx: 8, vy: 5 });
  Object.assign(other, { x: 450, y: 300, vx: 8, vy: 5 });
  const camera = new ThoughtCamera();
  camera.release(-400, 100);
  const before = world.positions(camera.x, camera.y);
  stepThoughtScene(world, camera, 0.1, ["hovered"]);
  const after = world.positions(camera.x, camera.y);
  assert.ok(camera.velocityX < 0 && camera.x < 0);
  assert.ok(Math.abs(after[0].x - before[0].x) < 1e-8);
  assert.ok(Math.abs(after[0].y - before[0].y) < 1e-8);
  assert.ok(Math.abs(after[1].x - before[1].x) > 20);
  assert.equal(hovered.vx, 8);
  stepThoughtScene(world, camera, 0.1, ["hovered"], 120);
  const edgeAfter = world.positions(camera.x, camera.y);
  assert.ok(Math.abs(edgeAfter[0].x - before[0].x) < 1e-8);
  assert.ok(Math.abs(edgeAfter[0].y - before[0].y) < 1e-8);
});

test("new input or interruption cancels both momentum and edge motion", () => {
  const camera = new ThoughtCamera();
  camera.release(300, 200);
  camera.step(0.2, 34, 34);
  camera.stop();
  const position = [camera.x, camera.y];
  camera.step(1);
  assert.deepEqual([camera.x, camera.y], position);
});
