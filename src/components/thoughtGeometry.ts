export type ThoughtBody = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mass: number;
  vx: number;
  vy: number;
  fixed: boolean;
};

export type ThoughtSize = {
  id: string;
  width: number;
  height: number;
  textLength: number;
};

const PACKING_PADDING = 20;
const PERIOD_BUFFER = 96;
const EPSILON = 1e-7;
const MAX_SUBSTEP = 1 / 120;
const MAX_COLLISION_PASSES = 6;
const RESTITUTION = 0.94;
const AIR_DRAG = 0.32;
const MAX_THOUGHT_SPEED = 180;
const MAX_POINTER_SPEED = 1200;
const POINTER_MOMENTUM = 0.2;

function limitVelocity(vx: number, vy: number, maximum: number) {
  if (!Number.isFinite(vx) || !Number.isFinite(vy)) return { vx: 0, vy: 0 };
  const scale = Math.min(1, maximum / (Math.hypot(vx, vy) || 1));
  return { vx: vx * scale, vy: vy * scale };
}

export function limitThoughtVelocity(vx: number, vy: number) {
  return limitVelocity(vx, vy, MAX_POINTER_SPEED);
}

function positiveDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function positiveViewport(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function clampRandom(value: number) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

function wrap(value: number, period: number) {
  const result = value % period;
  return result < 0 ? result + period : result;
}

/** The shortest signed distance from a to b on a periodic axis. */
function periodicDelta(a: number, b: number, period: number) {
  let delta = b - a;
  delta %= period;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function area(size: { width: number; height: number }) {
  return size.width * size.height;
}

export class ThoughtWorld {
  readonly bodies: ThoughtBody[] = [];
  readonly width: number;
  readonly height: number;

  private readonly viewportWidth: number;
  private readonly viewportHeight: number;
  private readonly random: () => number;
  private readonly driftSpeeds = new Map<string, number>();

  constructor(
    sizes: ThoughtSize[],
    viewportWidth: number,
    viewportHeight: number,
    random: () => number = Math.random,
  ) {
    this.viewportWidth = positiveViewport(viewportWidth);
    this.viewportHeight = positiveViewport(viewportHeight);
    this.random = () => clampRandom(random());

    const normalized = sizes.map((size) => ({
      id: size.id,
      width: positiveDimension(size.width),
      height: positiveDimension(size.height),
      mass: positiveDimension(size.textLength),
    }));
    const maximumWidth = normalized.reduce(
      (maximum, size) => Math.max(maximum, size.width),
      0,
    );
    const maximumHeight = normalized.reduce(
      (maximum, size) => Math.max(maximum, size.height),
      0,
    );
    const minimumWidth = this.viewportWidth + maximumWidth * 2 + PERIOD_BUFFER;
    const minimumHeight =
      this.viewportHeight + maximumHeight * 2 + PERIOD_BUFFER;

    // Keep enough free area for measured text rectangles and their packing gap.
    // The viewport-derived minimum remains the dominant dimension for ordinary
    // thought sets, while unusually dense caller input gets a larger torus.
    const requiredArea = normalized.reduce(
      (total, size) =>
        total +
        (size.width + PACKING_PADDING) * (size.height + PACKING_PADDING),
      0,
    );
    const areaScale = Math.max(
      1,
      Math.sqrt((requiredArea * 2.8) / (minimumWidth * minimumHeight || 1)),
    );
    let gridColumns = 1;
    let gridArea = Infinity;
    for (
      let columns = 1;
      columns <= Math.max(1, normalized.length);
      columns += 1
    ) {
      const rows = Math.ceil(normalized.length / columns);
      const gridWidth =
        PACKING_PADDING + columns * (maximumWidth + PACKING_PADDING);
      const gridHeight =
        PACKING_PADDING + rows * (maximumHeight + PACKING_PADDING);
      const candidateArea =
        Math.max(minimumWidth, gridWidth) * Math.max(minimumHeight, gridHeight);
      if (candidateArea < gridArea) {
        gridArea = candidateArea;
        gridColumns = columns;
      }
    }
    const guaranteedRows = Math.ceil(normalized.length / gridColumns);
    const guaranteedWidth =
      PACKING_PADDING + gridColumns * (maximumWidth + PACKING_PADDING);
    const guaranteedHeight =
      PACKING_PADDING + guaranteedRows * (maximumHeight + PACKING_PADDING);
    this.width = Math.ceil(Math.max(minimumWidth * areaScale, guaranteedWidth));
    this.height = Math.ceil(
      Math.max(minimumHeight * areaScale, guaranteedHeight),
    );

    const placed: ThoughtBody[] = [];
    const byIndex = new Map<number, ThoughtBody>();
    const ordered = normalized
      .map((size, index) => ({ size, index }))
      .sort((left, right) => area(right.size) - area(left.size));
    const planned: ({ x: number; y: number } | null)[] = [];
    for (const { size } of ordered) {
      const position = this.findPlacement(size, placed);
      planned.push(position);
      if (position) {
        placed.push({
          id: size.id,
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          mass: size.mass,
          vx: 0,
          vy: 0,
          fixed: false,
        });
      }
    }
    placed.length = 0;
    const useGuaranteedPacking = planned.some((position) => position === null);
    ordered.forEach(({ size, index }, order) => {
      const position = useGuaranteedPacking
        ? {
            x:
              PACKING_PADDING +
              (order % gridColumns) * (maximumWidth + PACKING_PADDING),
            y:
              PACKING_PADDING +
              Math.floor(order / gridColumns) *
                (maximumHeight + PACKING_PADDING),
          }
        : planned[order]!;
      const direction = this.random() * Math.PI * 2;
      const speed = 7 + this.random() * 8;
      this.driftSpeeds.set(size.id, speed);
      const body: ThoughtBody = {
        id: size.id,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        mass: size.mass,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        fixed: false,
      };
      placed.push(body);
      byIndex.set(index, body);
    });

    // Restore caller order so the geometry layer never changes the content
    // ordering supplied by the React layer.
    this.bodies.push(...normalized.map((_, index) => byIndex.get(index)!));
  }

  private nextRandom() {
    return this.random();
  }

  private capSpeed(body: ThoughtBody) {
    Object.assign(body, limitVelocity(body.vx, body.vy, MAX_THOUGHT_SPEED));
  }

  private hasPackingConflict(candidate: ThoughtBody, other: ThoughtBody) {
    const dx = Math.abs(
      periodicDelta(
        candidate.x + candidate.width / 2,
        other.x + other.width / 2,
        this.width,
      ),
    );
    const dy = Math.abs(
      periodicDelta(
        candidate.y + candidate.height / 2,
        other.y + other.height / 2,
        this.height,
      ),
    );
    const clearanceX = (candidate.width + other.width) / 2 + PACKING_PADDING;
    const clearanceY = (candidate.height + other.height) / 2 + PACKING_PADDING;
    return dx < clearanceX - EPSILON && dy < clearanceY - EPSILON;
  }

  private findPlacement(
    size: { id: string; width: number; height: number; mass: number },
    placed: ThoughtBody[],
  ) {
    const maximumX = Math.max(0, this.width - size.width);
    const maximumY = Math.max(0, this.height - size.height);
    const candidate: ThoughtBody = {
      id: size.id,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      mass: size.mass,
      vx: 0,
      vy: 0,
      fixed: false,
    };

    const accepts = (x: number, y: number) => {
      candidate.x = x;
      candidate.y = y;
      return !placed.some((other) => this.hasPackingConflict(candidate, other));
    };

    // Random candidates produce a loose, session-specific cloud. The bounded
    // retry count keeps construction predictable even with an awkward random
    // source, and the deterministic scan below makes packing total.
    const randomAttempts = Math.max(512, placed.length * 256);
    for (let attempt = 0; attempt < randomAttempts; attempt += 1) {
      const x = maximumX * this.nextRandom();
      const y = maximumY * this.nextRandom();
      if (accepts(x, y)) return { x, y };
    }

    const smallestSide = Math.max(1, Math.min(size.width, size.height));
    const coarseStep = Math.max(8, Math.min(32, smallestSide / 3));
    const scan = (step: number) => {
      for (let y = 0; y <= maximumY + EPSILON; y += step) {
        for (let x = 0; x <= maximumX + EPSILON; x += step) {
          if (accepts(Math.min(x, maximumX), Math.min(y, maximumY))) {
            return { x: candidate.x, y: candidate.y };
          }
        }
      }
      return null;
    };
    const coarse = scan(coarseStep);
    if (coarse) return coarse;
    const fine = scan(Math.max(1, Math.min(8, coarseStep / 2)));
    if (fine) return fine;

    return null;
  }

  private resolveCollision(
    a: ThoughtBody,
    b: ThoughtBody,
    movingWall?: { id: string; vx: number; vy: number },
  ) {
    const dx = periodicDelta(a.x + a.width / 2, b.x + b.width / 2, this.width);
    const dy = periodicDelta(
      a.y + a.height / 2,
      b.y + b.height / 2,
      this.height,
    );
    const overlapX = (a.width + b.width) / 2 - Math.abs(dx);
    const overlapY = (a.height + b.height) / 2 - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) return false;

    const resolveX = overlapX <= overlapY;
    const overlap = (resolveX ? overlapX : overlapY) + EPSILON;
    let normal = resolveX ? Math.sign(dx) : Math.sign(dy);
    if (normal === 0) {
      const relativeVelocity = resolveX ? b.vx - a.vx : b.vy - a.vy;
      normal = relativeVelocity >= 0 ? 1 : -1;
    }

    const aFixed = a.fixed;
    const bFixed = b.fixed;
    const inverseA = aFixed ? 0 : 1 / a.mass;
    const inverseB = bFixed ? 0 : 1 / b.mass;
    const inverseTotal = inverseA + inverseB;
    if (!aFixed && !bFixed) {
      const correctionA = (overlap * inverseA) / inverseTotal;
      const correctionB = (overlap * inverseB) / inverseTotal;
      if (resolveX) {
        a.x = wrap(a.x - normal * correctionA, this.width);
        b.x = wrap(b.x + normal * correctionB, this.width);
      } else {
        a.y = wrap(a.y - normal * correctionA, this.height);
        b.y = wrap(b.y + normal * correctionB, this.height);
      }
    } else if (!aFixed) {
      if (resolveX) a.x = wrap(a.x - normal * overlap, this.width);
      else a.y = wrap(a.y - normal * overlap, this.height);
    } else if (!bFixed) {
      if (resolveX) b.x = wrap(b.x + normal * overlap, this.width);
      else b.y = wrap(b.y + normal * overlap, this.height);
    }

    // Character count provides mass, independent of font size and wrapping.
    // A held question follows the pointer, but transfers a finite-mass impact.
    // Hovered questions remain stationary walls with no impact of their own.
    const velocity = (body: ThoughtBody) =>
      body.fixed
        ? movingWall?.id === body.id
          ? resolveX
            ? movingWall.vx
            : movingWall.vy
          : 0
        : resolveX
          ? body.vx
          : body.vy;
    const relative = (velocity(b) - velocity(a)) * normal;
    const impactInverseA = movingWall?.id === a.id ? 1 / a.mass : inverseA;
    const impactInverseB = movingWall?.id === b.id ? 1 / b.mass : inverseB;
    const impactInverseTotal = impactInverseA + impactInverseB;
    if (relative < -EPSILON && impactInverseTotal > 0) {
      const impulse = (-(1 + RESTITUTION) * relative) / impactInverseTotal;
      if (resolveX) {
        if (!aFixed) a.vx -= impulse * inverseA * normal;
        if (!bFixed) b.vx += impulse * inverseB * normal;
      } else {
        if (!aFixed) a.vy -= impulse * inverseA * normal;
        if (!bFixed) b.vy += impulse * inverseB * normal;
      }
      if (!aFixed) this.capSpeed(a);
      if (!bFixed) this.capSpeed(b);
    }
    return true;
  }

  private resolveCollisions(
    passes = MAX_COLLISION_PASSES,
    movingWall?: { id: string; vx: number; vy: number },
  ) {
    for (let pass = 0; pass < passes; pass += 1) {
      let collided = false;
      for (let first = 0; first < this.bodies.length; first += 1) {
        for (let second = first + 1; second < this.bodies.length; second += 1) {
          if (
            this.resolveCollision(
              this.bodies[first],
              this.bodies[second],
              movingWall,
            )
          )
            collided = true;
        }
      }
      if (!collided) break;
    }
  }

  /** Sweep a held question through the cloud without skipping collisions. */
  moveBody(id: string, deltaX: number, deltaY: number, seconds = 1 / 60) {
    const held = this.bodies.find((body) => body.id === id);
    if (!held || !Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    for (const body of this.bodies) {
      body.fixed = body === held;
      this.capSpeed(body);
    }
    const smallestSide = Math.min(
      ...this.bodies.map((body) => Math.min(body.width, body.height)),
    );
    const distance = Math.hypot(deltaX, deltaY);
    const pointerVelocity = limitThoughtVelocity(
      deltaX / Math.max(seconds, 0.008),
      deltaY / Math.max(seconds, 0.008),
    );
    const movingWall = {
      id,
      vx: pointerVelocity.vx * POINTER_MOMENTUM,
      vy: pointerVelocity.vy * POINTER_MOMENTUM,
    };
    const steps = Math.max(
      1,
      Math.ceil(distance / Math.min(8, smallestSide / 4)),
    );
    for (let step = 0; step < steps; step += 1) {
      held.x = wrap(held.x + deltaX / steps, this.width);
      held.y = wrap(held.y + deltaY / steps, this.height);
      this.resolveCollisions(
        Math.max(MAX_COLLISION_PASSES, this.bodies.length * 32),
        movingWall,
      );
    }
  }

  releaseBody(id: string, vx: number, vy: number) {
    const body = this.bodies.find((body) => body.id === id);
    if (!body) return;
    const velocity = limitThoughtVelocity(vx, vy);
    Object.assign(body, {
      vx: velocity.vx * POINTER_MOMENTUM,
      vy: velocity.vy * POINTER_MOMENTUM,
      fixed: false,
    });
    this.capSpeed(body);
  }

  step(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0 || this.bodies.length === 0)
      return;
    for (const body of this.bodies) this.capSpeed(body);
    const smallestSide = Math.min(
      ...this.bodies.map((body) => Math.min(body.width, body.height)),
    );
    const fastest = Math.max(
      ...this.bodies
        .filter((body) => !body.fixed)
        .map((body) => Math.hypot(body.vx, body.vy)),
      0,
    );
    const steps = Math.max(
      1,
      Math.ceil(seconds / MAX_SUBSTEP),
      Math.ceil((seconds * fastest) / Math.min(8, smallestSide / 4)),
    );
    const delta = seconds / steps;
    for (let iteration = 0; iteration < steps; iteration += 1) {
      for (const body of this.bodies) {
        if (body.fixed) continue;
        const speed = Math.hypot(body.vx, body.vy);
        const drift = this.driftSpeeds.get(body.id) ?? 0;
        // Air resistance removes thrown/collision speed gradually, preserving
        // the gentle ambient drift once that extra energy has dissipated.
        const decay = Math.exp(-AIR_DRAG * delta);
        const nextSpeed =
          speed > drift ? drift + (speed - drift) * decay : speed;
        const travel =
          speed > drift
            ? drift * delta + ((speed - drift) * (1 - decay)) / AIR_DRAG
            : speed * delta;
        if (speed > 0) {
          body.x = wrap(body.x + (body.vx / speed) * travel, this.width);
          body.y = wrap(body.y + (body.vy / speed) * travel, this.height);
          body.vx *= nextSpeed / speed;
          body.vy *= nextSpeed / speed;
        }
      }

      this.resolveCollisions();
    }
  }

  positions(cameraX: number, cameraY: number) {
    const xCamera = Number.isFinite(cameraX) ? cameraX : 0;
    const yCamera = Number.isFinite(cameraY) ? cameraY : 0;
    return this.bodies.map((body) => {
      const centerX = periodicDelta(
        xCamera,
        body.x + body.width / 2,
        this.width,
      );
      const centerY = periodicDelta(
        yCamera,
        body.y + body.height / 2,
        this.height,
      );
      return {
        id: body.id,
        x: centerX - body.width / 2 + this.viewportWidth / 2,
        y: centerY - body.height / 2 + this.viewportHeight / 2,
      };
    });
  }
}
