import type { ThoughtWorld } from "./thoughtGeometry";

const COAST_SECONDS = 0.38;
const MAX_RELEASE_SPEED = 1100;

/** Camera speed: equivalent to dragging away from the nearest screen edge. */
export function edgePanSpeed(position: number, extent: number) {
  const band = extent * 0.25;
  if (position < 0 || position > extent || band <= 0) return 0;
  const proximity =
    position < band
      ? -(1 - position / band)
      : position > extent - band
        ? 1 - (extent - position) / band
        : 0;
  return proximity * 120;
}

export class ThoughtCamera {
  x = 0;
  y = 0;
  velocityX = 0;
  velocityY = 0;

  stop() {
    this.velocityX = this.velocityY = 0;
  }

  release(velocityX: number, velocityY: number) {
    this.velocityX = Math.max(
      -MAX_RELEASE_SPEED,
      Math.min(MAX_RELEASE_SPEED, velocityX),
    );
    this.velocityY = Math.max(
      -MAX_RELEASE_SPEED,
      Math.min(MAX_RELEASE_SPEED, velocityY),
    );
  }

  /** Integrate exponential friction exactly, independent of frame rate. */
  step(seconds: number, edgeX = 0, edgeY = 0) {
    if (seconds <= 0 || !Number.isFinite(seconds)) return;
    const coastDecay = Math.exp(-seconds / COAST_SECONDS);
    this.x +=
      this.velocityX * COAST_SECONDS * (1 - coastDecay) + edgeX * seconds;
    this.y +=
      this.velocityY * COAST_SECONDS * (1 - coastDecay) + edgeY * seconds;
    this.velocityX *= coastDecay;
    this.velocityY *= coastDecay;
    if (Math.abs(this.velocityX) < 0.2) this.velocityX = 0;
    if (Math.abs(this.velocityY) < 0.2) this.velocityY = 0;
  }
}

/** Keep reading targets fixed on screen while the camera and other text move. */
export function stepThoughtScene(
  world: ThoughtWorld,
  camera: ThoughtCamera,
  seconds: number,
  fixedIds: readonly (string | null)[],
  edgeX = 0,
  edgeY = 0,
) {
  const previousX = camera.x;
  const previousY = camera.y;
  camera.step(seconds, edgeX, edgeY);
  for (const body of world.bodies) {
    body.fixed = fixedIds.includes(body.id);
    if (body.fixed) {
      body.x =
        (((body.x + camera.x - previousX) % world.width) + world.width) %
        world.width;
      body.y =
        (((body.y + camera.y - previousY) % world.height) + world.height) %
        world.height;
    }
  }
  world.step(seconds);
}
