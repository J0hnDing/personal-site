export type GalleryPhoto = {
  id: string;
  src: string;
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
const MAX_UNIT = 2.2;
type Tile = { x: number; y: number; width: number; height: number };

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
    maxZoom: width < 700 ? 1 : 1.1,
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

function chunkTiles(random: () => number): Tile[] {
  let used = reservedSquares();
  let tiles: Tile[] = [];
  const occupy = (tile: Tile) => {
    for (let y = tile.y; y < tile.y + tile.height; y++) {
      for (let x = tile.x; x < tile.x + tile.width; x++)
        used[y * CHUNK + x] = true;
    }
    tiles.push(tile);
  };

  for (let attempt = 0; attempt < 32; attempt++) {
    used = reservedSquares();
    tiles = [];
    const cuts = shuffled(
      Array.from({ length: (CHUNK - 1) * 2 }, (_, index) => ({
        horizontal: index < CHUNK - 1,
        cut: (index % (CHUNK - 1)) + 1,
      })),
      random,
    );
    for (const { horizontal, cut } of cuts) {
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
    if (tiles.length === cuts.length) break;
  }
  if (tiles.length !== (CHUNK - 1) * 2) {
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
          if (free) candidates.push({ x, y, width, height });
        }
      }
      occupy(candidates[Math.floor(random() * candidates.length)]);
    }

  // Merging full shared sides hides the scaffold; merges only remove seams.
  for (const tile of shuffled([...tiles], random)) {
    if (!tiles.includes(tile)) continue;
    const peers = tiles.filter(
      (other) =>
        other !== tile &&
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
    if (!peers.length || random() < 0.25) continue;
    const peer = peers[Math.floor(random() * peers.length)];
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
  return tiles;
}

export class GalleryWorld {
  readonly cells: GalleryCell[] = [];
  private chunks = new Map<string, GalleryCell[]>();
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
  // once per chunk. Grid spacing <=2.2m bounds any collinear edge run.
  get maxStraightLength() {
    return (2 * CHUNK + 1) * MAX_UNIT * this.layout.minimum;
  }

  private coordinate(index: number, axis: "x" | "y") {
    const jitter = hash(this.seed, `${axis}:${index}`) / 4294967296 - 0.5;
    return index * this.pitch + jitter * this.layout.minimum * 0.3;
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

  private generateChunk(chunkX: number, chunkY: number) {
    const key = `${chunkX},${chunkY}`;
    if (this.chunks.has(key)) return false;
    const random = randomSource(hash(this.seed, `chunk:${key}`));
    const generated: GalleryCell[] = [];
    for (const tile of chunkTiles(random)) {
      const col = chunkX * CHUNK + tile.x;
      const row = chunkY * CHUNK + tile.y;
      const x = this.coordinate(col, "x");
      const y = this.coordinate(row, "y");
      const width = this.coordinate(col + tile.width, "x") - x;
      const height = this.coordinate(row + tile.height, "y") - y;
      const cell: GalleryCell = {
        x,
        y,
        width,
        height,
        id: this.cells.length,
        photo: null,
        photoFrame: null,
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
    this.placePhotos(generated, chunkX, chunkY);
    this.chunks.set(key, generated);
    return true;
  }

  private placePhotos(cells: GalleryCell[], chunkX: number, chunkY: number) {
    const modulo = (value: number) =>
      ((value % PHOTO_PERIOD) + PHOTO_PERIOD) % PHOTO_PERIOD;
    const color = modulo(chunkX) + PHOTO_PERIOD * modulo(chunkY);
    // Each photograph belongs to one of nine spatial pools and appears at most
    // once per chunk. Repeats are separated by at least two whole chunks.
    const palette = this.validPhotos.filter(
      (_, index) => index % PHOTO_PERIOD ** 2 === color,
    );
    for (const photo of palette) {
      const ratio = photo.width / photo.height;
      const scale =
        this.layout.minimum *
        2.2 *
        (0.94 +
          (hash(this.seed, `photo-size:${photo.src}`) / 4294967296) * 0.12);
      const width = scale * Math.sqrt(ratio);
      const height = scale / Math.sqrt(ratio);
      const eligible = cells.filter(
        (cell) => !cell.photo && cell.width >= width && cell.height >= height,
      );
      const score = (cell: GalleryCell) =>
        Math.log((cell.width * cell.height) / (width * height)) +
        (hash(this.seed, `photo-slot:${photo.src}:${cell.x},${cell.y}`) /
          4294967296) *
          0.7;
      eligible.sort((a, b) => score(a) - score(b));
      const cell = eligible[0];
      if (!cell) continue;
      cell.photo = photo;
      cell.photoFrame = {
        x: cell.x + (cell.width - width) / 2,
        y: cell.y + (cell.height - height) / 2,
        width,
        height,
      };
    }
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
