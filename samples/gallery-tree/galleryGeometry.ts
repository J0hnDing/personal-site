export type GalleryPhoto = { id: string; src: string; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Side = "top" | "right" | "bottom" | "left";
export type GalleryCell = Rect & { id: number; parentId: number | null; depth: number; photo: GalleryPhoto | null };
export type GalleryLayout = {
  maxZoom: number;
  minimum: number;
  minScale: number;
  maxScale: number;
  maxDimension: number;
  ratios: readonly number[];
};
export type GalleryDebugEvent = { sequence: number; event: string; [key: string]: unknown };

const EPS = 0.001;
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];
const RECTANGLE_RATIOS: readonly (readonly [number, number])[] = [
  [1, 1], // square
  [5, 4],
  [3, 1],
  [3, 2],
  [16, 9],
];

const RATIOS = RECTANGLE_RATIOS.flatMap(([long, short]) =>
  long === short ? [1] : [long / short, short / long]);
const MINIMUM_DIMENSION = 70;
const CORNER_RANDOM_ATTEMPTS = 25;
const BACKTRACK_RETRIES = 10;
const MAX_BACKTRACKS_PER_STEP = 25;
const WIDEST_RATIO = Math.max(...RATIOS.map((ratio) => Math.max(ratio, 1 / ratio)));

export function dimensionsAtScale(scale: number, ratio: number) {
  const root = Math.sqrt(ratio);
  return { width: scale * root, height: scale / root };
}

function minimumScaleForRatio(minimum: number, ratio: number) {
  const root = Math.sqrt(ratio);
  return minimum * Math.max(root, 1 / root);
}

function shortSideWeight(width: number, height: number, layout: GalleryLayout) {
  const range = layout.maxScale - layout.minimum;
  const length = Math.min(width, height);
  const progress = range > 0 ? Math.max(0, Math.min(1, (length - layout.minimum) / range)) : 1;
  return 0.015 + progress * progress * (3 - 2 * progress);
}

function weightedIndex(weights: number[], randomValue: number) {
  let remaining = randomValue * weights.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < weights.length - 1; index++) {
    remaining -= weights[index];
    if (remaining < 0) return index;
  }
  return weights.length - 1;
}

export function createLayout(width: number, _height: number): GalleryLayout {
  const responsiveScale = width < 700 ? 0.8 : 1;
  const maxScale = 400 * responsiveScale;
  return {
    maxZoom: width < 700 ? 1 : 1.1,
    minimum: MINIMUM_DIMENSION,
    minScale: MINIMUM_DIMENSION,
    maxScale,
    maxDimension: maxScale * Math.sqrt(WIDEST_RATIO),
    ratios: RATIOS,
  };
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function overlap(a: number, b: number, c: number, d: number) {
  return Math.min(b, d) - Math.max(a, c);
}
function intersects(a: Rect, b: Rect) {
  return overlap(a.x, a.x + a.width, b.x, b.x + b.width) > EPS &&
    overlap(a.y, a.y + a.height, b.y, b.y + b.height) > EPS;
}
function sideInterval(rect: Rect, side: Side) {
  return side === "top" || side === "bottom"
    ? { start: rect.x, end: rect.x + rect.width }
    : { start: rect.y, end: rect.y + rect.height };
}
function attachedOnSide(parent: Rect, other: Rect, side: Side) {
  if (side === "top") return Math.abs(other.y + other.height - parent.y) < EPS;
  if (side === "bottom") return Math.abs(other.y - parent.y - parent.height) < EPS;
  if (side === "left") return Math.abs(other.x + other.width - parent.x) < EPS;
  return Math.abs(other.x - parent.x - parent.width) < EPS;
}
function place(parent: Rect, side: Side, start: number, width: number, height: number): Rect {
  if (side === "top") return { x: start, y: parent.y - height, width, height };
  if (side === "bottom") return { x: start, y: parent.y + parent.height, width, height };
  if (side === "left") return { x: parent.x - width, y: start, width, height };
  return { x: parent.x + parent.width, y: start, width, height };
}

type Quadrant = { dx: -1 | 1; dy: -1 | 1 };
export type ConcaveCorner = { x: number; y: number } & Quadrant;
const QUADRANTS: readonly Quadrant[] = [
  { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
  { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
];

function occupies(rect: Rect, x: number, y: number, quadrant: Quadrant) {
  const px = x + quadrant.dx * EPS * 4;
  const py = y + quadrant.dy * EPS * 4;
  return px > rect.x && px < rect.x + rect.width && py > rect.y && py < rect.y + rect.height;
}

// A new concave corner has three occupied quadrants and one empty quadrant.
export function newConcaveCorners(rect: Rect, existing: readonly Rect[]): ConcaveCorner[] {
  const xEdges = [rect.x, rect.x + rect.width];
  const yEdges = [rect.y, rect.y + rect.height];
  const points = new Map<string, { x: number; y: number }>();
  for (const other of existing) {
    for (const x of xEdges) for (const y of [other.y, other.y + other.height]) points.set(`${x}:${y}`, { x, y });
    for (const y of yEdges) for (const x of [other.x, other.x + other.width]) points.set(`${x}:${y}`, { x, y });
  }
  const corners: ConcaveCorner[] = [];
  for (const { x, y } of points.values()) {
    const before = QUADRANTS.map((quadrant) => existing.some((other) => occupies(other, x, y, quadrant)));
    if (before.filter(Boolean).length >= 3) continue;
    const after = QUADRANTS.map((quadrant, index) => before[index] || occupies(rect, x, y, quadrant));
    if (after.filter(Boolean).length !== 3) continue;
    corners.push({ x, y, ...QUADRANTS[after.indexOf(false)] });
  }
  return corners;
}

export function cornerRays(corner: ConcaveCorner, rectangles: readonly Rect[], minimum: number, maxDistance = Infinity) {
  const rays = [
    { origin: { x: corner.x, y: corner.y + corner.dy }, direction: { dx: corner.dx, dy: 0 } },
    { origin: { x: corner.x + corner.dx, y: corner.y }, direction: { dx: 0, dy: corner.dy } },
  ];
  return rays.map((ray) => {
    let distance: number | null = null;
    for (const rect of rectangles) {
      const horizontal = ray.direction.dx !== 0;
      const transverse = horizontal ? ray.origin.y : ray.origin.x;
      const transverseStart = horizontal ? rect.y : rect.x;
      const transverseEnd = transverseStart + (horizontal ? rect.height : rect.width);
      if (transverse <= transverseStart + EPS || transverse >= transverseEnd - EPS) continue;
      const start = horizontal ? rect.x : rect.y;
      const end = start + (horizontal ? rect.width : rect.height);
      const position = horizontal ? ray.origin.x : ray.origin.y;
      const direction = horizontal ? ray.direction.dx : ray.direction.dy;
      const ahead = direction > 0 ? end > position + EPS : start < position - EPS;
      if (!ahead) continue;
      const hit = direction > 0 ? Math.max(0, start - position) : Math.max(0, position - end);
      if (hit > maxDistance + EPS) continue;
      if (distance === null || hit < distance) distance = hit;
    }
    return { ...ray, distance, invalid: distance !== null && distance < minimum };
  });
}

export function cornerSegmentLengths(corner: ConcaveCorner, rectangles: readonly Rect[]) {
  const horizontalNeighbor = rectangles.find((rect) => occupies(rect, corner.x, corner.y, {
    dx: corner.dx, dy: -corner.dy as -1 | 1,
  }));
  const verticalNeighbor = rectangles.find((rect) => occupies(rect, corner.x, corner.y, {
    dx: -corner.dx as -1 | 1, dy: corner.dy,
  }));
  return {
    horizontal: horizontalNeighbor
      ? corner.dx > 0 ? horizontalNeighbor.x + horizontalNeighbor.width - corner.x : corner.x - horizontalNeighbor.x
      : null,
    vertical: verticalNeighbor
      ? corner.dy > 0 ? verticalNeighbor.y + verticalNeighbor.height - corner.y : corner.y - verticalNeighbor.y
      : null,
  };
}

// Positive margins project beyond the other rectangle; negative margins stop
// short of its edge. Compare the endpoint that forms this concave corner.
export function cornerMargins(corner: ConcaveCorner, candidate: Rect, existing: readonly Rect[]) {
  const margins: { otherIndex: number; otherSide: Side; margin: number }[] = [];
  for (const [otherIndex, other] of existing.entries()) {
    const horizontalContact = overlap(candidate.x, candidate.x + candidate.width, other.x, other.x + other.width) > EPS;
    const verticalContact = overlap(candidate.y, candidate.y + candidate.height, other.y, other.y + other.height) > EPS;
    const otherSide: Side | null = horizontalContact && Math.abs(candidate.y + candidate.height - other.y) < EPS ? "top"
      : horizontalContact && Math.abs(candidate.y - other.y - other.height) < EPS ? "bottom"
      : verticalContact && Math.abs(candidate.x + candidate.width - other.x) < EPS ? "left"
      : verticalContact && Math.abs(candidate.x - other.x - other.width) < EPS ? "right"
      : null;
    if (!otherSide) continue;
    const alongX = otherSide === "top" || otherSide === "bottom";
    const contactLine = alongX
      ? (otherSide === "top" ? other.y : other.y + other.height)
      : (otherSide === "left" ? other.x : other.x + other.width);
    if (Math.abs((alongX ? corner.y : corner.x) - contactLine) >= EPS) continue;
    const coordinate = alongX ? corner.x : corner.y;
    const candidateStart = alongX ? candidate.x : candidate.y;
    const otherStart = alongX ? other.x : other.y;
    const candidateEnd = candidateStart + (alongX ? candidate.width : candidate.height);
    const otherEnd = otherStart + (alongX ? other.width : other.height);
    if (coordinate < Math.max(candidateStart, otherStart) - EPS ||
        coordinate > Math.min(candidateEnd, otherEnd) + EPS) continue;
    if (Math.abs(coordinate - candidateStart) < EPS || Math.abs(coordinate - otherStart) < EPS) {
      margins.push({ otherIndex, otherSide, margin: otherStart - candidateStart });
    } else if (Math.abs(coordinate - candidateEnd) < EPS || Math.abs(coordinate - otherEnd) < EPS) {
      margins.push({ otherIndex, otherSide, margin: candidateEnd - otherEnd });
    }
  }
  return margins;
}

type Interval = { start: number; end: number };
type Candidate = {
  rect: Rect;
  side: Side;
  cornerAnchor: CornerAnchor | null;
  placementSource: string;
  sampleKey: string;
  photo: GalleryPhoto | null;
};
type Span = { start: number; end: number };
type CornerAnchor = {
  x: number; y: number; dx: -1 | 1; dy: -1 | 1; side: Side; parentId: number;
  rays: ReturnType<typeof cornerRays>;
  blockedDirections: number;
};
type PlacementFrame = {
  cellId: number;
  parentId: number;
  candidate: Candidate;
  cornerQueue: CornerAnchor[];
  placedBefore: number;
  retries: number;
  tried: Set<string>;
};
type CellUndo = {
  bounds: Rect;
  keys: string[];
  contacts: { id: number; lengths: Record<Side, number> }[];
};

export class GalleryWorld {
  readonly cells: GalleryCell[] = [];
  readonly debugEvents: GalleryDebugEvent[] = [];
  private queue: number[] = [];
  private head = 0;
  private debugSequence = 0;
  private debugParentId: number | null = null;
  private random: () => number;
  private buckets = new Map<string, Set<number>>();
  private occupiedSides = new Map<number, Record<Side, Span[]>>();
  private cellUndo: CellUndo[] = [];
  private placementHistory: PlacementFrame[] = [];
  private retryFrame: PlacementFrame | null = null;
  private backtrackTrace: Record<string, unknown> | null = null;
  private bounds: Rect;
  stalledParentId: number | null = null;
  lastError: string | null = null;
  private readonly bucketSize = 480;

  constructor(readonly photos: GalleryPhoto[], readonly layout: GalleryLayout, seed = Math.floor(Math.random() * 0xffffffff)) {
    this.random = randomSource(seed);
    const rootScale = Math.max(layout.minScale, Math.min(layout.maxScale, 150 * (layout.maxScale / 400)));
    const { width, height } = dimensionsAtScale(rootScale, 16 / 9);
    const root = { x: -width / 2, y: -height / 2, width, height };
    this.bounds = { ...root };
    this.add(root, null, null);
  }

  get pending() { return this.queue.length - this.head; }
  get processed() { return this.head; }
  get extent() { return { ...this.bounds }; }

  private recordDebug(event: string, details: Record<string, unknown> = {}) {
    const entry = { sequence: ++this.debugSequence, event, ...details };
    this.debugEvents.push(entry);
    return entry.sequence;
  }

  private describeCell(cell: GalleryCell) {
    return {
      id: cell.id,
      parentId: cell.parentId,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      photoId: cell.photo?.id ?? null,
    };
  }

  private describeCandidate(candidate: Candidate) {
    return {
      side: candidate.side,
      rect: { ...candidate.rect },
      sampleKey: candidate.sampleKey,
      placementSource: candidate.placementSource,
      photoId: candidate.photo?.id ?? null,
      cornerAnchor: candidate.cornerAnchor ? { ...candidate.cornerAnchor } : null,
    };
  }

  private candidateKey(candidate: Candidate) {
    const { x, y, width, height } = candidate.rect;
    return JSON.stringify([candidate.side, x, y, width, height]);
  }

  private describeCoverage(parent: GalleryCell) {
    return this.sideCoverage(parent).map(({ side, length, covered, free }) => ({
      side,
      length,
      covered,
      free: free.map((interval) => ({
        ...interval,
        length: interval.end - interval.start,
      })),
    }));
  }

  private keys(rect: Rect) {
    const keys: string[] = [];
    const left = Math.floor((rect.x - EPS) / this.bucketSize);
    const right = Math.floor((rect.x + rect.width + EPS) / this.bucketSize);
    const top = Math.floor((rect.y - EPS) / this.bucketSize);
    const bottom = Math.floor((rect.y + rect.height + EPS) / this.bucketSize);
    for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) keys.push(`${x},${y}`);
    return keys;
  }
  private nearby(rect: Rect) {
    const ids = new Set<number>();
    for (const key of this.keys(rect)) for (const id of this.buckets.get(key) ?? []) ids.add(id);
    return [...ids].map((id) => this.cells[id]);
  }
  query(rect: Rect) { return this.nearby(rect).filter((cell) => intersects(cell, rect)); }

  private add(rect: Rect, parent: GalleryCell | null, photo: GalleryPhoto | null) {
    const neighbors = this.nearby(rect);
    const keys = this.keys(rect);
    const undo: CellUndo = {
      bounds: { ...this.bounds }, keys,
      contacts: neighbors.map((other) => ({
        id: other.id,
        lengths: Object.fromEntries(SIDES.map((side) =>
          [side, this.occupiedSides.get(other.id)![side].length])) as Record<Side, number>,
      })),
    };
    const cell: GalleryCell = { ...rect, id: this.cells.length, parentId: parent?.id ?? null, depth: parent ? parent.depth + 1 : 0, photo };
    this.cells.push(cell);
    this.cellUndo.push(undo);
    this.occupiedSides.set(cell.id, { top: [], right: [], bottom: [], left: [] });
    for (const other of neighbors) {
      for (const side of SIDES) {
        if (attachedOnSide(cell, other, side)) this.recordContact(cell, other, side);
        if (attachedOnSide(other, cell, side)) this.recordContact(other, cell, side);
      }
    }
    this.queue.push(cell.id);
    for (const key of keys) {
      let bucket = this.buckets.get(key);
      if (!bucket) { bucket = new Set(); this.buckets.set(key, bucket); }
      bucket.add(cell.id);
    }
    const x = Math.min(this.bounds.x, rect.x);
    const y = Math.min(this.bounds.y, rect.y);
    this.bounds = {
      x, y,
      width: Math.max(this.bounds.x + this.bounds.width, rect.x + rect.width) - x,
      height: Math.max(this.bounds.y + this.bounds.height, rect.y + rect.height) - y,
    };
    return cell;
  }

  private removeLast() {
    const cell = this.cells.at(-1);
    const undo = this.cellUndo.at(-1);
    if (!cell || !undo || cell.id === 0 || this.queue.at(-1) !== cell.id) {
      throw new Error("Cannot rewind the rectangle tree");
    }
    this.cells.pop();
    this.cellUndo.pop();
    this.queue.pop();
    for (const key of undo.keys) {
      const bucket = this.buckets.get(key)!;
      bucket.delete(cell.id);
      if (!bucket.size) this.buckets.delete(key);
    }
    for (const { id, lengths } of undo.contacts) {
      const sides = this.occupiedSides.get(id)!;
      for (const side of SIDES) sides[side].length = lengths[side];
    }
    this.occupiedSides.delete(cell.id);
    this.bounds = undo.bounds;
    return cell;
  }

  private recordContact(cell: GalleryCell, other: GalleryCell, side: Side) {
    const own = sideInterval(cell, side);
    const adjacent = sideInterval(other, side);
    const start = Math.max(own.start, adjacent.start);
    const end = Math.min(own.end, adjacent.end);
    if (end - start > EPS) this.occupiedSides.get(cell.id)![side].push({ start, end });
  }

  freeIntervals(parent: GalleryCell, side: Side): Interval[] {
    const interval = sideInterval(parent, side);
    let free = [interval];
    for (const occupied of this.occupiedSides.get(parent.id)![side]) {
      free = free.flatMap(({ start, end }) => {
        const a = Math.max(start, occupied.start);
        const b = Math.min(end, occupied.end);
        if (b - a <= EPS) return [{ start, end }];
        return [
          ...(a - start > EPS ? [{ start, end: a }] : []),
          ...(end - b > EPS ? [{ start: b, end }] : []),
        ];
      });
    }
    return free;
  }

  sideCoverage(parent: GalleryCell) {
    return SIDES.map((side) => {
      const length = side === "top" || side === "bottom" ? parent.width : parent.height;
      const free = this.freeIntervals(parent, side);
      const exposed = free.reduce((total, interval) => total + interval.end - interval.start, 0);
      return { side, length, covered: length - exposed, free };
    });
  }

  isFilled(parent: GalleryCell) {
    return this.sideCoverage(parent).every(({ free }) => free.length === 0);
  }

  private corners(parent: GalleryCell, queued: CornerAnchor[] = []): CornerAnchor[] {
    const anchors: Omit<CornerAnchor, "rays" | "blockedDirections">[] = [];
    const nearby = this.nearby(parent);
    const xEdges = [...new Set(nearby.flatMap((cell) => [cell.x, cell.x + cell.width]))];
    const yEdges = [...new Set(nearby.flatMap((cell) => [cell.y, cell.y + cell.height]))];
    const parentXEdges = [parent.x, parent.x + parent.width];
    const parentYEdges = [parent.y, parent.y + parent.height];
    const points = new Map<string, { x: number; y: number }>();
    const addPoint = (x: number, y: number) => points.set(`${x}:${y}`, { x, y });

    // A corner involving the parent lies on one of its four sides. The other
    // coordinate comes from any nearby rectangle boundary, regardless of its
    // place in the generation tree.
    for (const x of parentXEdges) {
      for (const y of yEdges) {
        if (y >= parent.y - EPS && y <= parent.y + parent.height + EPS) addPoint(x, y);
      }
    }
    for (const y of parentYEdges) {
      for (const x of xEdges) {
        if (x >= parent.x - EPS && x <= parent.x + parent.width + EPS) addPoint(x, y);
      }
    }

    for (const { x, y } of points.values()) {
      const occupied = QUADRANTS.map((quadrant) =>
        nearby.some((cell) => occupies(cell, x, y, quadrant))
      );
      if (occupied.filter(Boolean).length !== 3) continue;
      const empty = QUADRANTS[occupied.indexOf(false)];
      const across: Quadrant = { dx: -empty.dx as -1 | 1, dy: empty.dy };
      const along: Quadrant = { dx: empty.dx, dy: -empty.dy as -1 | 1 };

      // Only prioritize fills that can attach along a side of this parent.
      // The other occupied sectors may belong to any existing rectangles.
      if (occupies(parent, x, y, across)) {
        anchors.push({ x, y, dx: empty.dx, dy: empty.dy, side: empty.dx < 0 ? "left" : "right", parentId: parent.id });
      }
      if (occupies(parent, x, y, along)) {
        anchors.push({ x, y, dx: empty.dx, dy: empty.dy, side: empty.dy < 0 ? "top" : "bottom", parentId: parent.id });
      }
    }
    const unique = new Map<string, Omit<CornerAnchor, "rays" | "blockedDirections">>();
    for (const anchor of anchors) {
      unique.set(this.cornerKey(anchor), anchor);
    }
    const retained = new Map(queued.map((corner) => [this.cornerKey(corner), corner]));
    return [...unique.values()].map((anchor) => {
      const prior = retained.get(this.cornerKey(anchor));
      if (prior) return prior;
      const reach = this.layout.maxDimension + 1;
      const neighbors = this.nearby({
        x: anchor.x - reach, y: anchor.y - reach, width: reach * 2, height: reach * 2,
      });
      const rays = cornerRays(anchor, neighbors, this.layout.minimum, this.layout.maxDimension);
      return { ...anchor, rays, blockedDirections: rays.filter((ray) => ray.distance !== null).length };
    }).sort((a, b) => a.blockedDirections - b.blockedDirections);
  }

  private positions(side: Side, interval: Interval, width: number, height: number) {
    const horizontal = side === "top" || side === "bottom";
    const span = horizontal ? width : height;
    // A placement may cross an interval endpoint; collisions reject blocked space.
    const first = interval.start - span + EPS * 2;
    const last = interval.end - EPS * 2;
    if (last < first - EPS) return [];
    const positions: { start: number; cornerAnchor: CornerAnchor | null; source: string; randomValue?: number }[] = [
      { start: interval.start, cornerAnchor: null, source: "interval-start" },
      { start: interval.end - span, cornerAnchor: null, source: "interval-end" },
    ];
    if (last - first > EPS) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const randomValue = this.random();
        positions.push({
          start: first + (last - first) * (0.1 + randomValue * 0.8),
          cornerAnchor: null,
          source: "random-sample",
          randomValue,
        });
      }
    } else positions.push({ start: first, cornerAnchor: null, source: "only-valid-position" });
    const unique = new Map<number, { start: number; cornerAnchor: CornerAnchor | null; source: string; randomValue?: number }>();
    for (const position of positions) {
      if (!unique.has(position.start)) unique.set(position.start, position);
    }
    return [...unique.values()];
  }

  private candidateCornerRays(parent: GalleryCell, side: Side, rect: Rect) {
    const neighbors = this.nearby(rect);
    const corners = newConcaveCorners(rect, neighbors);
    const margin = this.layout.minimum + 1;
    const probe = {
      x: rect.x - margin, y: rect.y - margin,
      width: rect.width + margin * 2, height: rect.height + margin * 2,
    };
    const rectangles = [...this.nearby(probe), rect];
    const checks = corners.map((corner) => ({
      corner,
      rays: cornerRays(corner, rectangles, this.layout.minimum),
    }));
    this.recordDebug("candidate-corner-rays", {
      parentId: parent.id, side, rect: { ...rect },
      minimum: this.layout.minimum, checks,
    });
    return { corners, neighbors, invalid: checks.some(({ rays }) => rays.some((ray) => ray.invalid)) };
  }

  private candidateCornerMargins(parent: GalleryCell, side: Side, rect: Rect, corners: ConcaveCorner[], neighbors: GalleryCell[]) {
    const checks = corners.map((corner) => ({
      corner,
      margins: cornerMargins(corner, rect, neighbors).map(({ otherIndex, otherSide, margin }) => ({
        otherId: neighbors[otherIndex].id,
        otherSide,
        margin,
        invalid: Math.abs(margin) > EPS && Math.abs(margin) < this.layout.minimum,
      })),
    }));
    this.recordDebug("candidate-corner-margins", {
      parentId: parent.id, side, rect: { ...rect },
      minimum: this.layout.minimum, checks,
    });
    return checks.some(({ margins }) => margins.some(({ invalid }) => invalid));
  }

  private candidateAt(
    parent: GalleryCell, side: Side, width: number, height: number,
    position: { start: number; cornerAnchor: CornerAnchor | null; source: string; randomValue?: number },
    interval: Interval | null,
    collisionOnly = false,
  ): Candidate | null {
    const rect = place(parent, side, position.start, width, height);
    const trace = {
      parentId: parent.id, side,
      interval: interval ? { ...interval, length: interval.end - interval.start } : null,
      dimension: { width, height },
      positionSource: position.source,
      positionRandomValue: position.randomValue ?? null,
      cornerAnchor: position.cornerAnchor ? { ...position.cornerAnchor } : null,
      rect,
    };
    const overlap = this.nearby(rect).find((other) => intersects(rect, other));
    if (overlap) {
      this.recordDebug("candidate-rejected", { ...trace, reason: "overlaps-rectangle-" + overlap.id });
      return null;
    }
    if (!collisionOnly) {
      const rayCheck = this.candidateCornerRays(parent, side, rect);
      if (rayCheck.invalid) {
        this.recordDebug("candidate-rejected", { ...trace, reason: "concave-corner-ray-below-minimum" });
        return null;
      }
      if (this.candidateCornerMargins(parent, side, rect, rayCheck.corners, rayCheck.neighbors)) {
        this.recordDebug("candidate-rejected", { ...trace, reason: "concave-corner-margin-below-minimum" });
        return null;
      }
    }
    const candidate: Candidate = {
      rect, side, cornerAnchor: position.cornerAnchor, placementSource: position.source,
      sampleKey: `dynamic:${width}:${height}`, photo: null,
    };
    this.recordDebug("candidate-accepted", { ...trace, candidate: this.describeCandidate(candidate) });
    return candidate;
  }

  private cornerPosition(corner: CornerAnchor, width: number, height: number, source: string) {
    return {
      start: corner.side === "top" || corner.side === "bottom"
        ? (corner.dx < 0 ? corner.x - width : corner.x)
        : (corner.dy < 0 ? corner.y - height : corner.y),
      cornerAnchor: corner,
      source,
    };
  }

  private cornerBounds(corner: CornerAnchor) {
    const reach = this.layout.maxDimension + 1;
    const neighbors = this.nearby({
      x: corner.x - reach, y: corner.y - reach, width: reach * 2, height: reach * 2,
    });
    // Priority keeps the creation-time hit count; placement uses current blockers.
    const rays = cornerRays(corner, neighbors, this.layout.minimum, this.layout.maxDimension);
    const segments = cornerSegmentLengths(corner, neighbors);
    const rayWidth = rays[0].distance ?? this.layout.maxDimension;
    const rayHeight = rays[1].distance ?? this.layout.maxDimension;
    const boundWidth = Math.min(rayWidth, segments.horizontal ?? this.layout.maxDimension);
    const boundHeight = Math.min(rayHeight, segments.vertical ?? this.layout.maxDimension);
    this.recordDebug("corner-parameter-bounds", {
      parentId: corner.parentId, corner: { ...corner }, rays, segments,
      rayWidth, rayHeight, boundWidth, boundHeight,
    });
    return { rayWidth, rayHeight, boundWidth, boundHeight };
  }

  private withinScale(width: number, height: number, maxWidth: number, maxHeight: number) {
    const scale = Math.sqrt(width * height);
    return Number.isFinite(scale) &&
      width >= this.layout.minimum - EPS && height >= this.layout.minimum - EPS &&
      width <= maxWidth + EPS && height <= maxHeight + EPS &&
      scale <= this.layout.maxScale + EPS;
  }

  private candidateForCorner(parent: GalleryCell, corner: CornerAnchor, tried?: Set<string>) {
    const bounds = this.cornerBounds(corner);
    const options = this.layout.ratios.flatMap((ratio) => {
      const root = Math.sqrt(ratio);
      const minScale = minimumScaleForRatio(this.layout.minimum, ratio);
      const maxScale = Math.min(
        this.layout.maxScale, bounds.rayWidth / root, bounds.rayHeight * root,
      );
      return maxScale >= minScale - EPS ? [{ ratio, minScale, maxScale }] : [];
    });
    this.recordDebug("candidate-search", {
      parentId: parent.id, mode: "corner", corner: { ...corner },
      filteredOptions: options.map(({ ratio, minScale, maxScale }) => ({ ratio, minScale, maxScale })),
    });
    const optionWeights = options.map(({ ratio, minScale, maxScale }) => {
      const expectedScale = minScale + (maxScale - minScale) * 2 / 3;
      const { width, height } = dimensionsAtScale(expectedScale, ratio);
      return shortSideWeight(width, height, this.layout);
    });
    let attempted = 0;
    for (let attempt = 0; attempt < CORNER_RANDOM_ATTEMPTS && options.length; attempt++) {
      attempted++;
      const optionRandomValue = this.random();
      const optionIndex = weightedIndex(optionWeights, optionRandomValue);
      const option = options[optionIndex];
      const scaleRandomValue = this.random();
      const scale = option.minScale + Math.sqrt(scaleRandomValue) * (option.maxScale - option.minScale);
      const { width, height } = dimensionsAtScale(scale, option.ratio);
      this.recordDebug("corner-parameter-choice", {
        parentId: parent.id, corner: { ...corner }, attempt: attempt + 1,
        ratio: option.ratio, scale, width, height,
        optionRandomValue, optionIndex, optionWeight: optionWeights[optionIndex], scaleRandomValue,
      });
      const candidate = this.candidateAt(parent, corner.side, width, height,
        this.cornerPosition(corner, width, height, "corner-random"), null);
      if (candidate && !tried?.has(this.candidateKey(candidate))) return { candidate, error: null };
      if (candidate) this.recordDebug("backtrack-candidate-skipped", {
        parentId: parent.id, candidate: this.describeCandidate(candidate),
      });
    }

    const parentAlongX = corner.side === "top" || corner.side === "bottom";
    const parentBound = parentAlongX ? bounds.boundWidth : bounds.boundHeight;
    const ratioOffset = Math.floor(this.random() * this.layout.ratios.length);
    for (let index = 0; index < this.layout.ratios.length; index++) {
      const ratio = this.layout.ratios[(ratioOffset + index) % this.layout.ratios.length];
      const width = parentAlongX ? parentBound : parentBound * ratio;
      const height = parentAlongX ? parentBound / ratio : parentBound;
      if (!this.withinScale(width, height, bounds.rayWidth, bounds.rayHeight)) continue;
      this.recordDebug("corner-fallback-choice", {
        parentId: parent.id, corner: { ...corner }, stage: "parent-bound", ratio, width, height,
      });
      const candidate = this.candidateAt(parent, corner.side, width, height,
        this.cornerPosition(corner, width, height, "corner-parent-bound"), null);
      if (candidate && !tried?.has(this.candidateKey(candidate))) return { candidate, error: null };
      if (candidate) this.recordDebug("backtrack-candidate-skipped", {
        parentId: parent.id, candidate: this.describeCandidate(candidate),
      });
    }

    const width = bounds.rayWidth;
    const height = bounds.rayHeight;
    this.recordDebug("corner-fallback-choice", {
      parentId: parent.id, corner: { ...corner }, stage: "ray-bounds", width, height,
    });
    const candidate = this.candidateAt(parent, corner.side, width, height,
      this.cornerPosition(corner, width, height, "corner-ray-bounds"), null, true);
    if (candidate && !tried?.has(this.candidateKey(candidate))) return { candidate, error: null };
    if (candidate) this.recordDebug("backtrack-candidate-skipped", {
      parentId: parent.id, candidate: this.describeCandidate(candidate),
    });
    const error = `Corner (${corner.x.toFixed(1)}, ${corner.y.toFixed(1)}) on parent #${parent.id}: ` +
      `no new attachment after ${attempted} random choices and both fallbacks.`;
    this.recordDebug("corner-attachment-error", { parentId: parent.id, corner: { ...corner }, bounds, error });
    return { candidate: null, error };
  }

  private candidatesForExposedSide(parent: GalleryCell, side: Side, tried?: Set<string>) {
    const candidates: Candidate[] = [];
    const intervals = this.freeIntervals(parent, side);
    this.recordDebug("candidate-search", {
      parentId: parent.id, mode: "exposed-side", side,
      intervals: intervals.map((interval) => ({ ...interval, length: interval.end - interval.start })),
    });
    for (const interval of intervals) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const ratio = this.layout.ratios[Math.floor(this.random() * this.layout.ratios.length)];
        const minScale = minimumScaleForRatio(this.layout.minimum, ratio);
        const scale = minScale + this.random() * (this.layout.maxScale - minScale);
        const { width, height } = dimensionsAtScale(scale, ratio);
        for (const position of this.positions(side, interval, width, height)) {
          const candidate = this.candidateAt(parent, side, width, height, position, interval);
          if (candidate && !tried?.has(this.candidateKey(candidate))) candidates.push(candidate);
        }
      }
    }
    return candidates;
  }
  private sampleCandidate(candidates: Candidate[], parentId: number, purpose: string): Candidate | undefined {
    if (!candidates.length) return undefined;
    const byRectangle = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      const group = byRectangle.get(candidate.sampleKey) ?? [];
      group.push(candidate);
      byRectangle.set(candidate.sampleKey, group);
    }
    const rectangles = [...byRectangle.values()];
    const groupWeights = rectangles.map((group) =>
      shortSideWeight(group[0].rect.width, group[0].rect.height, this.layout));
    const groupRandomValue = this.random();
    const groupIndex = weightedIndex(groupWeights, groupRandomValue);
    const placements = rectangles[groupIndex];
    const placementRandomValue = this.random();
    const placementIndex = Math.floor(placementRandomValue * placements.length);
    const selected = placements[placementIndex];
    this.recordDebug("candidate-sampled", {
      parentId,
      purpose,
      candidateCount: candidates.length,
      dimensionGroups: rectangles.map((group, index) => ({
        sampleKey: group[0].sampleKey,
        placementCount: group.length,
        shortestSide: Math.min(group[0].rect.width, group[0].rect.height),
        weight: groupWeights[index],
      })),
      groupRandomValue,
      selectedGroupIndex: groupIndex,
      placementRandomValue,
      selectedPlacementIndex: placementIndex,
      selected: this.describeCandidate(selected),
    });
    return selected;
  }

  private cornerKey(corner: Omit<CornerAnchor, "rays" | "blockedDirections">) {
    return `${corner.parentId}:${corner.x}:${corner.y}:${corner.dx}:${corner.dy}:${corner.side}`;
  }

  private refreshCornerQueue(parent: GalleryCell, queue: CornerAnchor[]) {
    const before = [...queue];
    const current = this.corners(parent, queue);
    const currentKeys = new Set(current.map((corner) => this.cornerKey(corner)));
    const previousKeys = new Set(queue.map((corner) => this.cornerKey(corner)));
    const added = current.filter((corner) => !previousKeys.has(this.cornerKey(corner)));
    queue.splice(0, queue.length, ...current);
    this.recordDebug("corner-queue-updated", {
      parentId: parent.id,
      filled: before.filter((corner) => !currentKeys.has(this.cornerKey(corner))).map((corner) => ({ ...corner })),
      added: added.map((corner) => ({ ...corner })),
      queued: queue.map((corner) => ({ ...corner })),
    });
  }
  hasAvailablePlacement(parent: GalleryCell) {
    const corners = this.corners(parent);
    if (corners.length) return this.candidateForCorner(parent, corners[0]).candidate !== null;
    return SIDES.some((side) => this.freeIntervals(parent, side).length > 0 &&
      this.candidatesForExposedSide(parent, side).length > 0);
  }

  private backtrack(failedParentId: number, failure: string | null) {
    const removed: { id: number; parentId: number; source: string; reason: string }[] = [];
    this.retryFrame = null;
    while (this.placementHistory.length) {
      const frame = this.placementHistory.pop()!;
      const cell = this.removeLast();
      if (cell.id !== frame.cellId) throw new Error("Placement history is out of order");
      const source = frame.candidate.placementSource;
      const fixed = source === "corner-parent-bound" || source === "corner-ray-bounds";
      const reason = fixed ? "fixed-dimensions" : frame.retries >= BACKTRACK_RETRIES ? "retry-limit" : "retry";
      removed.push({ id: cell.id, parentId: frame.parentId, source, reason });
      if (reason !== "retry") continue;
      frame.retries++;
      frame.tried.add(this.candidateKey(frame.candidate));
      this.retryFrame = frame;
      this.head = frame.parentId;
      this.stalledParentId = null;
      this.lastError = null;
      this.backtrackTrace = {
        failedParentId, failure, removed, retryCellId: frame.cellId,
        retryParentId: frame.parentId, retryNumber: frame.retries, retryLimit: BACKTRACK_RETRIES,
      };
      return true;
    }
    this.head = 0;
    this.backtrackTrace = { failedParentId, failure, removed, retryLimit: BACKTRACK_RETRIES };
    return false;
  }

  private attemptCurrentParent() {
    const id = this.queue[this.head];
    if (id === undefined) return false;
    if (this.debugParentId !== id) {
      this.debugEvents.length = 0;
      this.debugSequence = 0;
      this.debugParentId = id;
    }
    const parent = this.cells[id];
    const retry = this.retryFrame?.parentId === id ? this.retryFrame : null;
    this.stalledParentId = null;
    this.lastError = null;
    this.recordDebug("parent-processing-start", {
      parent: this.describeCell(parent),
      queueIndex: this.head,
      pendingCells: this.pending,
      coverage: this.describeCoverage(parent),
    });
    if (this.backtrackTrace) {
      this.recordDebug("backtrack-resumed", this.backtrackTrace);
      this.backtrackTrace = null;
    }
    // Fill every corner involving this parent before trying an exposed side.
    const cornerQueue = retry ? [...retry.cornerQueue] : this.corners(parent);
    this.recordDebug("corner-queue-initialized", {
      parentId: parent.id, queued: cornerQueue.map((corner) => ({ ...corner })),
    });
    let placed = retry?.placedBefore ?? 0;
    let stallReason = "no-valid-candidates";
    while (true) {
      const corner = cornerQueue[0];
      let choice: Candidate | undefined;
      let choiceReason: "corner-priority" | "open-side";
      let side: Side | null = null;
      let candidateCount = 0;
      if (corner) {
        choiceReason = "corner-priority";
        const result = this.candidateForCorner(parent, corner, this.retryFrame?.tried);
        if (!result.candidate) {
          stallReason = "corner-attachment-error";
          this.lastError = result.error;
          break;
        }
        side = corner.side;
        choice = result.candidate;
        candidateCount = 1;
      } else {
        if (this.isFilled(parent)) break;
        choiceReason = "open-side";
        const sidePools = SIDES.filter((nextSide) => this.freeIntervals(parent, nextSide).length > 0)
          .map((nextSide) => ({
            side: nextSide,
            candidates: this.candidatesForExposedSide(parent, nextSide, this.retryFrame?.tried),
          }))
          .filter(({ candidates }) => candidates.length > 0);
        if (!sidePools.length) {
          stallReason = "no-valid-open-side-candidates";
          this.lastError = `Parent #${parent.id} has exposed space but no valid random attachment.`;
          break;
        }
        const selectedSide = sidePools[Math.floor(this.random() * sidePools.length)];
        side = selectedSide.side;
        candidateCount = selectedSide.candidates.length;
        choice = this.sampleCandidate(selectedSide.candidates, parent.id, choiceReason);
      }
      this.recordDebug("placement-choice", {
        parentId: parent.id, placementIndex: placed, hasCorner: Boolean(corner),
        corner: corner ? { ...corner } : null, side,
        candidateCounts: { dynamic: candidateCount, selectedPool: candidateCount },
        chosen: choice ? this.describeCandidate(choice) : null, reason: choiceReason,
      });
      if (!choice) {
        stallReason = "candidate-selection-returned-empty";
        break;
      }
      const previousQueue = [...cornerQueue];
      const added = this.add(choice.rect, parent, choice.photo);
      const frame: PlacementFrame = retry && this.retryFrame === retry ? retry : {
        cellId: added.id, parentId: parent.id, candidate: choice,
        cornerQueue: previousQueue, placedBefore: placed, retries: 0, tried: new Set(),
      };
      frame.cellId = added.id;
      frame.candidate = choice;
      frame.cornerQueue = previousQueue;
      frame.placedBefore = placed;
      this.placementHistory.push(frame);
      this.retryFrame = null;
      this.recordDebug("rectangle-placed", {
        parentId: parent.id, placementIndex: placed, reason: choiceReason,
        selected: this.describeCandidate(choice), cell: this.describeCell(added),
        coverageAfterPlacement: this.describeCoverage(parent),
      });
      this.refreshCornerQueue(parent, cornerQueue);
      placed++;
    }
    if (!this.isFilled(parent)) {
      this.recordDebug("placement-search-exhausted", {
        parentId: id, placementIndex: placed, reason: stallReason,
        cornerQueue: cornerQueue.map((corner) => ({ ...corner })), coverage: this.describeCoverage(parent),
      });
      this.recordDebug("parent-attempt-failed", {
        parentId: id, reason: stallReason, error: this.lastError, coverage: this.describeCoverage(parent),
        children: this.cells.filter((cell) => cell.parentId === parent.id).map((cell) => this.describeCell(cell)),
      });
      return false;
    }
    this.recordDebug("parent-filled", {
      parentId: id,
      coverage: this.describeCoverage(parent),
      children: this.cells.filter((cell) => cell.parentId === parent.id).map((cell) => this.describeCell(cell)),
    });
    this.head++;
    return true;
  }

  processNext() {
    let backtracks = 0;
    while (this.queue[this.head] !== undefined) {
      const failedParentId = this.queue[this.head];
      if (this.attemptCurrentParent()) return true;
      const failure = this.lastError;
      if (!this.backtrack(failedParentId, failure)) {
        this.stalledParentId = this.queue[this.head] ?? failedParentId;
        this.lastError = `Backtracking exhausted after parent #${failedParentId} failed: ${failure ?? "no valid attachment"}`;
        this.debugEvents.length = 0;
        this.debugSequence = 0;
        this.debugParentId = this.stalledParentId;
        this.recordDebug("parent-processing-start", {
          parent: this.describeCell(this.cells[this.stalledParentId]),
          queueIndex: this.head,
          pendingCells: this.pending,
          coverage: this.describeCoverage(this.cells[this.stalledParentId]),
        });
        this.recordDebug("backtrack-exhausted", this.backtrackTrace ?? {});
        this.recordDebug("parent-stalled", {
          parentId: this.stalledParentId, reason: "backtrack-exhausted", error: this.lastError,
          coverage: this.describeCoverage(this.cells[this.stalledParentId]),
        });
        this.backtrackTrace = null;
        return false;
      }
      backtracks++;
      if (backtracks >= MAX_BACKTRACKS_PER_STEP) return true;
    }
    return false;
  }

  ensureCoverage(view: Rect, maxParents = 1600) {
    const margin = Math.max(360, view.width * 0.3, view.height * 0.3);
    const required = { x: view.x - margin, y: view.y - margin, width: view.width + margin * 2, height: view.height + margin * 2 };
    let count = 0;
    while (count < maxParents && this.pending) {
      const b = this.bounds;
      if (b.x <= required.x && b.y <= required.y && b.x + b.width >= required.x + required.width && b.y + b.height >= required.y + required.height) break;
      if (!this.processNext()) break;
      count++;
    }
    return count;
  }
}
