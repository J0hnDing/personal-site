export type GalleryPhoto = {
  id: string;
  src: string;
  fullSrc?: string;
  width: number;
  height: number;
};
export type Rect = { x: number; y: number; width: number; height: number };
export type GalleryCell = Rect & {
  id: number;
  photo: GalleryPhoto | null;
  photoFrame: Rect | null;
};
export type GalleryLayout = { maxZoom: number; minimum: number };

const CHUNK = 9;
const CENTER = 4;
const PHOTO_PERIOD = 3;
const MAX_UNIT = 2.02;
const PHOTO_SCALE = 2.15 * 2;
type PhotoPlan = { photo: GalleryPhoto; width: number; height: number };
type Tile = {
  x: number;
  y: number;
  width: number;
  height: number;
  photo?: PhotoPlan;
};
type PhotoZone = (
  zone: Tile,
  photo: PhotoPlan,
  orientation: number,
) => Tile[] | null;

// Verified disjoint bridges for every internal x/y cut, used if random search
// exhausts its budget. Filling the remaining unit squares cannot fail.
const FALLBACK_BRIDGES: readonly (readonly [number, number, number, number])[] =
  [
    [1, 6, 0, 1],
    [0, 5, 1, 0],
    [4, 5, 0, 1],
    [1, 3, 1, 0],
    [6, 2, 0, 1],
    [8, 7, 0, 1],
    [1, 0, 0, 1],
    [2, 2, 1, 0],
    [7, 3, 0, 1],
    [2, 4, 0, 1],
    [3, 3, 1, 0],
    [4, 2, 1, 0],
    [5, 0, 1, 0],
    [6, 5, 1, 0],
    [7, 2, 1, 0],
    [0, 1, 0, 1],
  ];

export function createLayout(width: number, _height: number): GalleryLayout {
  return {
    maxZoom: 2,
    minimum: 112 * (width < 700 ? 0.8 : 1),
  };
}

function hash(seed: number, key: string) {
  let value = seed >>> 0;
  for (let index = 0; index < key.length; index++)
    value = Math.imul(value ^ key.charCodeAt(index), 16777619);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function intersects(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Prefer photographs actually on screen, then nearby buffered ones. Spatial
// pools do most of the spacing; this also handles unusually wide/zoomed views.
export function selectVisiblePhotos(cells: GalleryCell[], view: Rect) {
  const seen = new Set<string>();
  const selected = new Set<number>();
  const centerX = view.x + view.width / 2;
  const centerY = view.y + view.height / 2;
  const candidates = cells.filter((cell) => cell.photo && cell.photoFrame);
  const distance = (cell: GalleryCell) => {
    const frame = cell.photoFrame!;
    return (
      (frame.x + frame.width / 2 - centerX) ** 2 +
      (frame.y + frame.height / 2 - centerY) ** 2
    );
  };
  candidates.sort(
    (a, b) =>
      Number(intersects(b.photoFrame!, view)) -
        Number(intersects(a.photoFrame!, view)) ||
      distance(a) - distance(b) ||
      a.y - b.y ||
      a.x - b.x,
  );
  for (const cell of candidates) {
    if (seen.has(cell.photo!.src)) continue;
    seen.add(cell.photo!.src);
    selected.add(cell.id);
  }
  return cells.map((cell) =>
    !cell.photo || selected.has(cell.id)
      ? cell
      : { ...cell, photo: null, photoFrame: null },
  );
}

function shuffled<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function reservedSquares() {
  const used = Array<boolean>(CHUNK * CHUNK).fill(false);
  // Left/top halves belong to neighbors. Right/bottom halves belong here.
  for (const [x, y] of [
    [0, CENTER],
    [CHUNK - 1, CENTER],
    [CENTER, 0],
    [CENTER, CHUNK - 1],
  ])
    used[y * CHUNK + x] = true;
  return used;
}

function sharedPhotoSidePenalty(picture: Rect, peers: Rect[]) {
  const epsilon = 1e-7;
  return peers.reduce((penalty, peer) => {
    let length = 0;
    if (
      Math.abs(picture.x + picture.width - peer.x) < epsilon ||
      Math.abs(peer.x + peer.width - picture.x) < epsilon
    )
      length += Math.max(
        0,
        Math.min(picture.y + picture.height, peer.y + peer.height) -
          Math.max(picture.y, peer.y),
      );
    if (
      Math.abs(picture.y + picture.height - peer.y) < epsilon ||
      Math.abs(peer.y + peer.height - picture.y) < epsilon
    )
      length += Math.max(
        0,
        Math.min(picture.x + picture.width, peer.x + peer.width) -
          Math.max(picture.x, peer.x),
      );
    // Quadratic cost makes long contact progressively less attractive. It is
    // added to the score, so touching never disqualifies a feasible candidate.
    return penalty + 0.75 * length ** 2;
  }, 0);
}

function chunkTiles(
  random: () => number,
  shiftDirection = 1,
  horizontalDirection = 1,
  photoPlans: PhotoPlan[] = [],
  photoZone?: PhotoZone,
  neighborPhotos: Rect[] = [],
): Tile[] {
  let used = reservedSquares();
  let tiles: Tile[] = [];
  const occupy = (tile: Tile) => {
    for (let y = tile.y; y < tile.y + tile.height; y++) {
      for (let x = tile.x; x < tile.x + tile.width; x++)
        used[y * CHUNK + x] = true;
    }
    tiles.push(tile);
  };

  let complete = false;

  // Random candidates receive a soft crowding/coverage score. There are no
  // assigned quarters or target positions; seeded choices stay fixed on revisit.
  const plans = shuffled([...photoPlans], random).slice(0, 4);
  const samples = [
    ...Array.from({ length: 24 }, () => ({
      x: random() * CHUNK,
      y: random() * CHUNK,
    })),
    ...[0, CHUNK].flatMap((edge) => [
      { x: edge, y: 0 },
      { x: edge, y: CHUNK },
      { x: edge, y: random() * CHUNK },
      { x: random() * CHUNK, y: edge },
    ]),
  ];
  let balancedFallback: { tiles: Tile[]; used: boolean[] } | undefined;

  for (let attempt = 0; attempt < 32; attempt++) {
    used = reservedSquares();
    tiles = [];
    // Photos reserve their regions first. Their exact image proportions then
    // determine the partition inside each region; blank space is tiled last.
    for (const photo of plans) {
      const width = photo.width > photo.height * 1.08 ? 4 : 3;
      const height = photo.height > photo.width * 1.08 ? 4 : 3;
      const pictures = tiles.filter((tile) => tile.photo);
      const centers = pictures.map((tile) => ({
        x: tile.x + tile.width / 2,
        y: tile.y + tile.height / 2,
      }));
      const positions = shuffled(
        Array.from(
          { length: (CHUNK - width + 1) * (CHUNK - height + 1) },
          (_, index) => ({
            x: index % (CHUNK - width + 1),
            y: Math.floor(index / (CHUNK - width + 1)),
            width,
            height,
          }),
        ),
        random,
      );
      const candidates = positions.flatMap((zone) => {
        for (let y = zone.y; y < zone.y + height; y++)
          for (let x = zone.x; x < zone.x + width; x++) {
            if (used[y * CHUNK + x]) return [];
          }
        const reserved = photoZone?.(zone, photo, Math.floor(random() * 4));
        const picture = reserved?.find((tile) => tile.photo);
        if (!reserved || !picture) return [];
        // A reservation must leave every remaining seam breakable. This
        // constrains feasibility without assigning any preferred location.
        const blocked = (x: number, y: number) =>
          used[y * CHUNK + x] ||
          (x >= zone.x &&
            x < zone.x + width &&
            y >= zone.y &&
            y < zone.y + height);
        for (const vertical of [true, false])
          for (let cut = 1; cut < CHUNK; cut++) {
            if (
              [...tiles, ...reserved].some((tile) =>
                vertical
                  ? tile.x < cut - 1e-8 && tile.x + tile.width > cut + 1e-8
                  : tile.y < cut - 1e-8 && tile.y + tile.height > cut + 1e-8,
              )
            )
              continue;
            let possible = false;
            for (let offset = 0; offset < CHUNK; offset++)
              if (
                vertical
                  ? !blocked(cut - 1, offset) && !blocked(cut, offset)
                  : !blocked(offset, cut - 1) && !blocked(offset, cut)
              ) {
                possible = true;
                break;
              }
            if (!possible) return [];
          }
        const center = {
          x: picture.x + picture.width / 2,
          y: picture.y + picture.height / 2,
        };
        const squared = (
          a: { x: number; y: number },
          b: { x: number; y: number },
        ) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        const edgeDistance = (rect: Tile, point: { x: number; y: number }) =>
          Math.max(0, rect.x - point.x, point.x - rect.x - rect.width) ** 2 +
          Math.max(0, rect.y - point.y, point.y - rect.y - rect.height) ** 2;
        const gaps = samples.map((point) =>
          Math.min(
            edgeDistance(picture, point),
            ...pictures.map((other) => edgeDistance(other, point)),
          ),
        );
        const coverage =
          gaps.reduce((sum, distance) => sum + distance, 0) / gaps.length +
          Math.max(...gaps) * 0.7;
        const nearest = Math.sqrt(
          Math.min(Infinity, ...centers.map((other) => squared(center, other))),
        );
        const crowding = Math.max(0, 3.2 - nearest) ** 2;
        const sharedSides = sharedPhotoSidePenalty(picture, [
          ...pictures,
          ...neighborPhotos,
        ]);
        return [
          {
            zone,
            reserved,
            score:
              coverage +
              crowding * 2 +
              sharedSides +
              random() * (2.5 + Math.min(attempt, 6)),
          },
        ];
      });
      candidates.sort((a, b) => a.score - b.score);
      for (const { zone, reserved } of candidates) {
        for (let y = zone.y; y < zone.y + height; y++)
          for (let x = zone.x; x < zone.x + width; x++)
            used[y * CHUNK + x] = true;
        tiles.push(...reserved);
        break;
      }
    }
    const cuts = shuffled(
      Array.from({ length: (CHUNK - 1) * 2 }, (_, index) => ({
        horizontal: index < CHUNK - 1,
        cut: (index % (CHUNK - 1)) + 1,
      })),
      random,
    );
    for (const { horizontal, cut } of cuts) {
      if (
        tiles.some((tile) =>
          horizontal
            ? tile.x < cut - 1e-8 && tile.x + tile.width > cut + 1e-8
            : tile.y < cut - 1e-8 && tile.y + tile.height > cut + 1e-8,
        )
      )
        continue;
      const candidates: Tile[] = [];
      for (let offset = 0; offset < CHUNK; offset++) {
        const x = horizontal ? cut - 1 : offset;
        const y = horizontal ? offset : cut - 1;
        const width = horizontal ? 2 : 1;
        const height = horizontal ? 1 : 2;
        if (
          !used[y * CHUNK + x] &&
          !used[(y + height - 1) * CHUNK + x + width - 1]
        )
          candidates.push({ x, y, width, height });
      }
      if (!candidates.length) break;
      occupy(candidates[Math.floor(random() * candidates.length)]);
    }
    const bridged = cuts.every(({ horizontal, cut }) =>
      tiles.some((tile) =>
        horizontal
          ? tile.x < cut - 1e-8 && tile.x + tile.width > cut + 1e-8
          : tile.y < cut - 1e-8 && tile.y + tile.height > cut + 1e-8,
      ),
    );
    const photoCount = tiles.filter((tile) => tile.photo).length;
    complete = bridged && photoCount === (photoZone ? plans.length : 0);
    if (bridged && photoCount >= Math.min(3, plans.length))
      balancedFallback = { tiles, used };
    if (complete) break;
  }
  if (!complete && balancedFallback) {
    tiles = balancedFallback.tiles;
    used = balancedFallback.used;
  } else if (!complete) {
    used = reservedSquares();
    tiles = [];
    for (const [x, y, dx, dy] of FALLBACK_BRIDGES)
      occupy({ x, y, width: dx + 1, height: dy + 1 });
  }

  // The scaffold breaks all straight seams. Every leftover square is filled;
  // a 1x1 always fits, so no unfillable pockets or subminimum fallbacks exist.
  for (let y = 0; y < CHUNK; y++)
    for (let x = 0; x < CHUNK; x++) {
      if (used[y * CHUNK + x]) continue;
      const candidates: Tile[] = [];
      for (let height = 1; height <= 3 && y + height <= CHUNK; height++) {
        for (let width = 1; width <= 3 && x + width <= CHUNK; width++) {
          let free = true;
          for (let row = y; row < y + height; row++) {
            for (let col = x; col < x + width; col++)
              if (used[row * CHUNK + col]) free = false;
          }
          if (free && Math.max(width / height, height / width) <= 2)
            candidates.push({ x, y, width, height });
        }
      }
      occupy(candidates[Math.floor(random() * candidates.length)]);
    }

  // Merging full shared sides hides the scaffold; merges only remove seams.
  for (const tile of shuffled([...tiles], random)) {
    if (!tiles.includes(tile) || tile.photo) continue;
    const peers = tiles.filter(
      (other) =>
        other !== tile &&
        !other.photo &&
        ((tile.y === other.y &&
          tile.height === other.height &&
          tile.width + other.width <= 3 &&
          (tile.x + tile.width === other.x ||
            other.x + other.width === tile.x)) ||
          (tile.x === other.x &&
            tile.width === other.width &&
            tile.height + other.height <= 3 &&
            (tile.y + tile.height === other.y ||
              other.y + other.height === tile.y))),
    );
    const compactPeers = peers.filter((peer) => {
      const width =
        Math.max(tile.x + tile.width, peer.x + peer.width) -
        Math.min(tile.x, peer.x);
      const height =
        Math.max(tile.y + tile.height, peer.y + peer.height) -
        Math.min(tile.y, peer.y);
      return Math.max(width / height, height / width) <= 2;
    });
    if (!compactPeers.length || random() < 0.25) continue;
    const peer = compactPeers[Math.floor(random() * compactPeers.length)];
    const right = Math.max(tile.x + tile.width, peer.x + peer.width);
    const bottom = Math.max(tile.y + tile.height, peer.y + peer.height);
    tile.x = Math.min(tile.x, peer.x);
    tile.y = Math.min(tile.y, peer.y);
    tile.width = right - tile.x;
    tile.height = bottom - tile.y;
    tiles.splice(tiles.indexOf(peer), 1);
  }
  tiles.push(
    { x: CHUNK - 1, y: CENTER, width: 2, height: 1 },
    { x: CENTER, y: CHUNK - 1, width: 1, height: 2 },
  );
  relaxJunctions(tiles, random, shiftDirection, horizontalDirection);
  return tiles;
}

// Shift a complete shared edge component on one side of a cross. Both
// adjacent rectangles move together, so its union stays filled; the other
// component stays put, turning the cross into two offset T-junctions.
function relaxJunctions(
  tiles: Tile[],
  random: () => number,
  direction: number,
  horizontalDirection: number,
) {
  const epsilon = 1e-8;
  const shift = (x: number, y: number, vertical: boolean, side: number) => {
    const fixed = vertical ? x : y;
    const along = (vertical ? y : x) * side;
    const edges = tiles
      .map((tile) => {
        const position = vertical ? tile.x : tile.y;
        const length = vertical ? tile.width : tile.height;
        const origin = vertical ? tile.y : tile.x;
        const span = vertical ? tile.height : tile.width;
        return {
          tile,
          position,
          length,
          span,
          start: side > 0 ? origin : -origin - span,
          end: side > 0 ? origin + span : -origin,
        };
      })
      .filter(
        (edge) =>
          edge.start >= along - epsilon &&
          (Math.abs(edge.position - fixed) < epsilon ||
            Math.abs(edge.position + edge.length - fixed) < epsilon),
      );
    let end = along;
    let previous: number;
    do {
      previous = end;
      for (const edge of edges)
        if (edge.start <= end + epsilon) end = Math.max(end, edge.end);
    } while (end > previous + epsilon);
    const component = edges.filter((edge) => edge.start < end - epsilon);
    if (component.some((edge) => edge.tile.photo)) return false;
    const coverage = (left: boolean) =>
      component
        .filter(
          (edge) =>
            Math.abs(
              (left ? edge.position : edge.position + edge.length) - fixed,
            ) < epsilon,
        )
        .reduce((total, edge) => total + edge.span, 0);
    if (
      !component.length ||
      Math.abs(coverage(true) - (end - along)) > epsilon ||
      Math.abs(coverage(false) - (end - along)) > epsilon
    )
      return false;
    const next =
      fixed +
      (vertical ? direction : horizontalDirection) * (0.025 + random() * 0.035);
    const replacements = component.map((edge) => {
      const left = Math.abs(edge.position - fixed) < epsilon;
      return {
        ...edge,
        position: left ? next : edge.position,
        length: left
          ? edge.position + edge.length - next
          : next - edge.position,
      };
    });
    if (
      replacements.some(
        (edge) =>
          edge.length < 0.9 ||
          Math.max(edge.length / edge.span, edge.span / edge.length) > 2.13,
      )
    )
      return false;
    for (const edge of replacements) {
      if (vertical) {
        edge.tile.x = edge.position;
        edge.tile.width = edge.length;
      } else {
        edge.tile.y = edge.position;
        edge.tile.height = edge.length;
      }
    }
    return true;
  };

  // Adjacent chunks slide in opposite directions, breaking coincident border
  // junctions without changing their shared rectangular extent or bridge halves.
  for (const cut of shuffled(
    Array.from({ length: CHUNK - 1 }, (_, index) => index + 1),
    random,
  )) {
    shift(cut, 0, true, 1);
    shift(cut, CHUNK, true, -1);
    shift(0, cut, false, 1);
    shift(CHUNK, cut, false, -1);
  }
  for (let iteration = 0; iteration < CHUNK * CHUNK; iteration++) {
    const vertices = new Map<string, { x: number; y: number; count: number }>();
    for (const tile of tiles)
      for (const x of [tile.x, tile.x + tile.width]) {
        for (const y of [tile.y, tile.y + tile.height]) {
          const key = `${x.toFixed(8)},${y.toFixed(8)}`;
          const vertex = vertices.get(key) ?? { x, y, count: 0 };
          vertex.count++;
          vertices.set(key, vertex);
        }
      }
    const crosses = shuffled(
      [...vertices.values()].filter(
        ({ x, y, count }) =>
          count === 4 &&
          x > epsilon &&
          x < CHUNK - epsilon &&
          y > epsilon &&
          y < CHUNK - epsilon,
      ),
      random,
    );
    let changed = false;
    for (const { x, y } of crosses) {
      for (const [vertical, side] of shuffled<[boolean, number]>(
        [
          [true, 1],
          [true, -1],
          [false, 1],
          [false, -1],
        ],
        random,
      )) {
        if (shift(x, y, vertical, side)) {
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
    if (!changed) break;
  }
}

export class GalleryWorld {
  readonly cells: GalleryCell[] = [];
  private chunks = new Map<string, GalleryCell[]>();
  private chunkPlans = new Map<string, Tile[]>();
  private bounds: Rect | null = null;
  private pitch: number;
  private validPhotos: GalleryPhoto[];

  constructor(
    readonly photos: GalleryPhoto[],
    readonly layout: GalleryLayout,
    readonly seed = Math.floor(Math.random() * 0xffffffff),
  ) {
    if (!Number.isFinite(layout.minimum) || layout.minimum <= 0)
      throw new RangeError("Gallery minimum must be positive");
    this.pitch = layout.minimum * 1.9;
    const sources = new Set<string>();
    this.validPhotos = shuffled(
      photos
        .filter(
          (photo) =>
            Number.isFinite(photo.width) &&
            Number.isFinite(photo.height) &&
            photo.width > 0 &&
            photo.height > 0,
        )
        .filter((photo) => {
          if (sources.has(photo.src)) return false;
          sources.add(photo.src);
          return true;
        })
        .sort((a, b) => a.id.localeCompare(b.id)),
      randomSource(hash(seed, "photo-palette")),
    );
  }

  get extent(): Rect {
    return this.bounds
      ? { ...this.bounds }
      : { x: 0, y: 0, width: 0, height: 0 };
  }

  // Inner grid lines are crossed in every chunk; chunk boundaries are crossed
  // once per chunk. Grid spacing <=2.02m bounds any collinear edge run.
  get maxStraightLength() {
    return (2 * CHUNK + 1) * MAX_UNIT * this.layout.minimum;
  }

  private coordinate(index: number, axis: "x" | "y") {
    const integer = Math.floor(index);
    const at = (unit: number) =>
      unit * this.pitch +
      (hash(this.seed, `${axis}:${unit}`) / 4294967296 - 0.5) *
        this.layout.minimum *
        0.12;
    // Fractional coordinates slide individual seams without changing the
    // shared outer boundary or introducing new independent lattice lines.
    return at(integer) + (at(integer + 1) - at(integer)) * (index - integer);
  }

  private unitAt(coordinate: number, axis: "x" | "y") {
    let index = Math.floor(coordinate / this.pitch);
    if (
      !Number.isSafeInteger(index) ||
      !Number.isSafeInteger(index + CHUNK * 2)
    ) {
      throw new RangeError("Gallery coordinate exceeds numeric precision");
    }
    while (this.coordinate(index, axis) > coordinate) index--;
    while (this.coordinate(index + 1, axis) <= coordinate) index++;
    return index;
  }

  private range(view: Rect) {
    if (
      ![
        view.x,
        view.y,
        view.width,
        view.height,
        view.x + view.width,
        view.y + view.height,
      ].every(Number.isFinite) ||
      view.width < 0 ||
      view.height < 0
    )
      throw new RangeError("Gallery view must be a finite rectangle");
    return {
      // Cross-boundary tiles are owned by the chunk on their left/top.
      left: Math.floor(this.unitAt(view.x, "x") / CHUNK) - 1,
      right: Math.floor(this.unitAt(view.x + view.width, "x") / CHUNK),
      top: Math.floor(this.unitAt(view.y, "y") / CHUNK) - 1,
      bottom: Math.floor(this.unitAt(view.y + view.height, "y") / CHUNK),
    };
  }

  private planChunk(chunkX: number, chunkY: number): Tile[] {
    const key = `${chunkX},${chunkY}`;
    const cached = this.chunkPlans.get(key);
    if (cached) return cached;
    const random = randomSource(hash(this.seed, `chunk:${key}`));
    const modulo = (value: number) =>
      ((value % PHOTO_PERIOD) + PHOTO_PERIOD) % PHOTO_PERIOD;
    const color = modulo(chunkX) + PHOTO_PERIOD * modulo(chunkY);
    const photoPlans = this.validPhotos
      .filter((_, index) => index % PHOTO_PERIOD ** 2 === color)
      .map((photo) => {
        const scale =
          this.layout.minimum *
          PHOTO_SCALE *
          (0.94 +
            (hash(this.seed, `photo-size:${photo.src}`) / 4294967296) * 0.12);
        const ratio = Math.sqrt(photo.width / photo.height);
        return { photo, width: scale * ratio, height: scale / ratio };
      });
    const photoZone: PhotoZone = (zone, photo, orientation) =>
      this.partitionPhotoZone(zone, photo, chunkX, chunkY, orientation);
    // Plan alternating chunks first. The other half score their shared edges
    // against all four neighbors, so every boundary is considered without a
    // recursive dependency or a dependence on the camera's exploration order.
    const neighbors =
      (chunkX + chunkY) % 2 === 0
        ? []
        : [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].flatMap(([dx, dy]) =>
            this.planChunk(chunkX + dx, chunkY + dy)
              .filter(
                (tile) =>
                  tile.photo &&
                  (dx === -1
                    ? Math.abs(tile.x + tile.width - CHUNK) < 1e-7
                    : dx === 1
                      ? Math.abs(tile.x) < 1e-7
                      : dy === -1
                        ? Math.abs(tile.y + tile.height - CHUNK) < 1e-7
                        : Math.abs(tile.y) < 1e-7),
              )
              .map((tile) => ({
                ...tile,
                x: tile.x + dx * CHUNK,
                y: tile.y + dy * CHUNK,
              })),
          );
    const tiles = chunkTiles(
      random,
      chunkY % 2 === 0 ? 1 : -1,
      chunkX % 2 === 0 ? 1 : -1,
      photoPlans,
      photoZone,
      neighbors,
    );
    this.chunkPlans.set(key, tiles);
    return tiles;
  }

  private generateChunk(chunkX: number, chunkY: number) {
    const key = `${chunkX},${chunkY}`;
    if (this.chunks.has(key)) return false;
    const generated: GalleryCell[] = [];
    for (const tile of this.planChunk(chunkX, chunkY)) {
      const col = chunkX * CHUNK + tile.x;
      const row = chunkY * CHUNK + tile.y;
      const x = this.coordinate(col, "x");
      const y = this.coordinate(row, "y");
      const width =
        tile.photo?.width ?? this.coordinate(col + tile.width, "x") - x;
      const height =
        tile.photo?.height ?? this.coordinate(row + tile.height, "y") - y;
      const cell: GalleryCell = {
        x,
        y,
        width,
        height,
        id: this.cells.length,
        photo: tile.photo?.photo ?? null,
        photoFrame: tile.photo ? { x, y, width, height } : null,
      };
      generated.push(cell);
      this.cells.push(cell);
      const b = this.bounds;
      const left = Math.min(b?.x ?? x, x);
      const top = Math.min(b?.y ?? y, y);
      this.bounds = {
        x: left,
        y: top,
        width: Math.max(b ? b.x + b.width : x + width, x + width) - left,
        height: Math.max(b ? b.y + b.height : y + height, y + height) - top,
      };
    }

    this.chunks.set(key, generated);
    return true;
  }

  private fractionalUnit(value: number, axis: "x" | "y") {
    const unit = this.unitAt(value, axis);
    const start = this.coordinate(unit, axis);
    return unit + (value - start) / (this.coordinate(unit + 1, axis) - start);
  }

  private partitionPhotoZone(
    zone: Tile,
    photo: PhotoPlan,
    chunkX: number,
    chunkY: number,
    orientation: number,
  ): Tile[] | null {
    const col = chunkX * CHUNK;
    const row = chunkY * CHUNK;
    const x = this.coordinate(col + zone.x, "x");
    const y = this.coordinate(row + zone.y, "y");
    const width = this.coordinate(col + zone.x + zone.width, "x") - x;
    const height = this.coordinate(row + zone.y + zone.height, "y") - y;
    const { width: photoWidth, height: photoHeight } = photo;
    const rectangles: (Rect & { photo?: PhotoPlan })[] =
      photoWidth >= photoHeight
        ? [
            { x, y, width: photoWidth, height: photoHeight, photo },
            { x: x + photoWidth, y, width: width - photoWidth, height },
            {
              x,
              y: y + photoHeight,
              width: photoWidth,
              height: height - photoHeight,
            },
          ]
        : [
            { x, y, width: photoWidth, height: photoHeight, photo },
            { x, y: y + photoHeight, width, height: height - photoHeight },
            {
              x: x + photoWidth,
              y,
              width: width - photoWidth,
              height: photoHeight,
            },
          ];
    // Split any long filler along its long axis. This lets larger pictures
    // retain exact proportions without leaving skinny bordering rectangles.
    const compact = rectangles.flatMap((rect) => {
      if (rect.photo) return [rect];
      const horizontal = rect.width >= rect.height;
      const count = Math.ceil(
        Math.max(rect.width / rect.height, rect.height / rect.width) / 2.4,
      );
      return Array.from({ length: count }, (_, index) => ({
        x: rect.x + (horizontal ? (rect.width * index) / count : 0),
        y: rect.y + (horizontal ? 0 : (rect.height * index) / count),
        width: horizontal ? rect.width / count : rect.width,
        height: horizontal ? rect.height : rect.height / count,
        photo: undefined,
      }));
    });
    if (
      compact.some(
        (rect) =>
          rect.width < this.layout.minimum ||
          rect.height < this.layout.minimum ||
          Math.max(rect.width / rect.height, rect.height / rect.width) > 2.4,
      )
    )
      return null;
    return compact.map((rect) => {
      const left =
        orientation & 1 ? x + width - (rect.x - x) - rect.width : rect.x;
      const top =
        orientation & 2 ? y + height - (rect.y - y) - rect.height : rect.y;
      const unitX = this.fractionalUnit(left, "x");
      const unitY = this.fractionalUnit(top, "y");
      return {
        x: unitX - col,
        y: unitY - row,
        width: this.fractionalUnit(left + rect.width, "x") - unitX,
        height: this.fractionalUnit(top + rect.height, "y") - unitY,
        photo: rect.photo,
      };
    });
  }

  ensureCoverage(view: Rect) {
    this.range(view);
    const margin = 360;
    const required = {
      x: view.x - margin,
      y: view.y - margin,
      width: view.width + 2 * margin,
      height: view.height + 2 * margin,
    };
    const { left, right, top, bottom } = this.range(required);
    let count = 0;
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) if (this.generateChunk(x, y)) count++;
    return count;
  }

  query(view: Rect) {
    const { left, right, top, bottom } = this.range(view);
    if (!view.width || !view.height) return [];
    const result: GalleryCell[] = [];
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        for (const cell of this.chunks.get(`${x},${y}`) ?? [])
          if (intersects(cell, view)) result.push(cell);
      }
    return result;
  }
}
