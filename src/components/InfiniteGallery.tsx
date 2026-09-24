import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

type GalleryPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
};

type GalleryCell = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  photo: GalleryPhoto | null;
};

type GridLine = {
  id: string;
  x: number;
  y: number;
  length: number;
  direction: "horizontal" | "vertical";
};

type Rect = { x: number; y: number; width: number; height: number };

type GalleryLayout = {
  pitchX: number;
  pitchY: number;
  minCellSize: number;
  maxLeafWidth: number;
  maxLeafHeight: number;
  maxZoom: number;
  minPhotoWidth: number;
  minPhotoHeight: number;
  maxPhotoWidth: number;
  maxPhotoHeight: number;
};

type GalleryChunk = {
  key: string;
  column: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  cells: GalleryCell[];
  lines: GridLine[];
};

type VisibleChunk = GalleryChunk & { animate: boolean };

type Camera = {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
};

type DragState = {
  pointerId: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  velocityX: number;
  velocityY: number;
};

const MIN_ZOOM = 0.72;
const MAX_CACHED_CHUNKS = 96;
const ASSET_MANIFEST_URL = `${import.meta.env.BASE_URL}gallery-assets/manifest.json`;

function createLayout(width: number, height: number): GalleryLayout {
  const compact = width < 700;
  const maxZoom = compact ? 1 : 1.1;
  return {
    // Large regions are only a virtualization boundary. Several unrelated
    // BSP leaves inside each region may be photographed, or none may be.
    pitchX: Math.round(
      compact
        ? Math.max(620, Math.min(850, width * 2.1))
        : Math.max(1020, Math.min(1600, width * 0.96)),
    ),
    pitchY: Math.round(
      compact
        ? Math.max(880, Math.min(1180, height * 1.2))
        : Math.max(900, Math.min(1250, height * 1.12)),
    ),
    minCellSize: compact ? 55 : 78,
    maxLeafWidth: compact ? 300 : 425,
    maxLeafHeight: compact ? 325 : 390,
    maxZoom,
    minPhotoWidth: compact ? 92 : 116,
    minPhotoHeight: compact ? 84 : 94,
    maxPhotoWidth: compact ? 295 : 470,
    maxPhotoHeight: compact ? 320 : 420,
  };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chunkSeed(sessionSeed: number, column: number, row: number) {
  let value = sessionSeed ^ Math.imul(column, 0x9e3779b1);
  value = Math.imul(value ^ Math.imul(row, 0x85ebca6b), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

function axisBoundary(
  index: number,
  pitch: number,
  sessionSeed: number,
  salt: number,
) {
  if (index === 0) return 0;
  const hash = chunkSeed(sessionSeed ^ salt, index, index ^ salt);
  return index * pitch + (hash / 0xffffffff - 0.5) * pitch * 0.3;
}

function axisIndex(
  position: number,
  pitch: number,
  sessionSeed: number,
  salt: number,
) {
  let index = Math.floor(position / pitch);
  while (axisBoundary(index, pitch, sessionSeed, salt) > position) index -= 1;
  while (axisBoundary(index + 1, pitch, sessionSeed, salt) <= position)
    index += 1;
  return index;
}

function chunkGeometry(
  sessionSeed: number,
  column: number,
  row: number,
  layout: GalleryLayout,
) {
  const x = axisBoundary(column, layout.pitchX, sessionSeed, 0x673a2b1d);
  const y = axisBoundary(row, layout.pitchY, sessionSeed, 0x2984c741);
  const width =
    axisBoundary(column + 1, layout.pitchX, sessionSeed, 0x673a2b1d) - x;
  const height =
    axisBoundary(row + 1, layout.pitchY, sessionSeed, 0x2984c741) - y;
  return { x, y, width, height };
}

function randomInt(random: () => number, min: number, max: number) {
  return min + Math.floor(random() * (max - min + 1));
}

function randomBetween(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function makeChunk(
  sessionSeed: number,
  column: number,
  row: number,
  photos: GalleryPhoto[],
  layout: GalleryLayout,
): GalleryChunk {
  const random = seededRandom(chunkSeed(sessionSeed, column, row));
  const key = column + "," + row;
  const { x, y, width, height } = chunkGeometry(
    sessionSeed,
    column,
    row,
    layout,
  );
  const cells: GalleryCell[] = [];
  const lines: GridLine[] = [];
  const addLine = (
    lineX: number,
    lineY: number,
    length: number,
    direction: GridLine["direction"],
  ) => {
    lines.push({
      id: key + ":line:" + lines.length,
      x: lineX,
      y: lineY,
      length,
      direction,
    });
  };
  const splitVertical = (rect: Rect, at: number): [Rect, Rect] => {
    addLine(at, rect.y, rect.height, "vertical");
    return [
      { x: rect.x, y: rect.y, width: at - rect.x, height: rect.height },
      {
        x: at,
        y: rect.y,
        width: rect.x + rect.width - at,
        height: rect.height,
      },
    ];
  };
  const splitHorizontal = (rect: Rect, at: number): [Rect, Rect] => {
    addLine(rect.x, at, rect.width, "horizontal");
    return [
      { x: rect.x, y: rect.y, width: rect.width, height: at - rect.y },
      {
        x: rect.x,
        y: at,
        width: rect.width,
        height: rect.y + rect.height - at,
      },
    ];
  };

  // A chunk boundary is a virtualization seam, not an image slot. Build the
  // entire irregular partition before deciding which leaves receive photos.
  addLine(0, 0, width, "horizontal");
  addLine(0, height, width, "horizontal");
  addLine(0, 0, height, "vertical");
  addLine(width, 0, height, "vertical");

  const leaves: Rect[] = [];
  const subdivide = (rect: Rect, depth: number) => {
    const canSplitX = rect.width >= layout.minCellSize * 2.15;
    const canSplitY = rect.height >= layout.minCellSize * 2.15;
    const aspect = rect.width / rect.height;
    const needsSplit =
      rect.width > layout.maxLeafWidth ||
      rect.height > layout.maxLeafHeight ||
      aspect > 2.2 ||
      aspect < 0.45;
    const largeEmpty =
      depth >= 2 &&
      rect.width < layout.maxLeafWidth * 1.4 &&
      rect.height < layout.maxLeafHeight * 1.4 &&
      random() < 0.11;
    if (
      depth >= 8 ||
      (!canSplitX && !canSplitY) ||
      largeEmpty ||
      (!needsSplit && random() < 0.76)
    ) {
      leaves.push(rect);
      return;
    }

    const xPressure = rect.width / layout.maxLeafWidth;
    const yPressure = rect.height / layout.maxLeafHeight;
    const vertical =
      canSplitX &&
      (!canSplitY ||
        xPressure > yPressure * 1.16 ||
        (xPressure >= yPressure * 0.84 && random() < 0.5));
    if (vertical) {
      const minimum = Math.max(layout.minCellSize, rect.width * 0.28);
      const maximum = Math.min(
        rect.width - layout.minCellSize,
        rect.width * 0.72,
      );
      if (minimum < maximum) {
        const [left, right] = splitVertical(
          rect,
          rect.x + randomBetween(random, minimum, maximum),
        );
        subdivide(left, depth + 1);
        subdivide(right, depth + 1);
        return;
      }
    } else if (canSplitY) {
      const minimum = Math.max(layout.minCellSize, rect.height * 0.28);
      const maximum = Math.min(
        rect.height - layout.minCellSize,
        rect.height * 0.72,
      );
      if (minimum < maximum) {
        const [top, bottom] = splitHorizontal(
          rect,
          rect.y + randomBetween(random, minimum, maximum),
        );
        subdivide(top, depth + 1);
        subdivide(bottom, depth + 1);
        return;
      }
    }
    leaves.push(rect);
  };
  subdivide({ x: 0, y: 0, width, height }, 0);

  type PhotoOption = {
    photo: GalleryPhoto;
    rect: Rect;
    direction: GridLine["direction"];
    first: boolean;
    at: number;
  };
  const acceptedPhotos: Rect[] = [];
  const usedPhotos = new Set<string>();
  const photoGroup =
    (((column % 2) + 2) % 2) + 2 * (((row % 2) + 2) % 2);
  const palette = photos.filter((_, index) => index % 4 === photoGroup);
  const chunkPhotos = palette.length ? palette : photos;
  const order = leaves.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = randomInt(random, 0, index);
    [order[index], order[other]] = [order[other], order[index]];
  }
  const compact = layout.minCellSize < 70;
  const targetPhotos = Math.max(
    3,
    Math.min(
      12,
      Math.round(
        (width * height) /
          (compact ? 120000 : 165000) *
          randomBetween(random, 0.82, 1.18),
      ),
    ),
  );
  const borderGap = 7;
  const fitsPhoto = (rect: Rect) => {
    if (
      rect.width < layout.minPhotoWidth ||
      rect.height < layout.minPhotoHeight ||
      rect.width > layout.maxPhotoWidth ||
      rect.height > layout.maxPhotoHeight ||
      rect.x < borderGap ||
      rect.y < borderGap ||
      rect.x + rect.width > width - borderGap ||
      rect.y + rect.height > height - borderGap
    ) {
      return false;
    }
    return acceptedPhotos.every((other) => {
      const overlapX = Math.max(
        0,
        Math.min(rect.x + rect.width, other.x + other.width) -
          Math.max(rect.x, other.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(rect.y + rect.height, other.y + other.height) -
          Math.max(rect.y, other.y),
      );
      const gapX = Math.max(
        0,
        other.x - rect.x - rect.width,
        rect.x - other.x - other.width,
      );
      const gapY = Math.max(
        0,
        other.y - rect.y - rect.height,
        rect.y - other.y - other.height,
      );
      return (
        (gapX > 2 || overlapY <= Math.min(rect.height, other.height) * 0.32) &&
        (gapY > 2 || overlapX <= Math.min(rect.width, other.width) * 0.32)
      );
    });
  };
  const cellId = (kind: string) => key + ":" + kind + ":" + cells.length;

  for (const leafIndex of order) {
    const leaf = leaves[leafIndex];
    if (acceptedPhotos.length >= targetPhotos || random() < 0.08) {
      cells.push({ id: cellId("empty"), ...leaf, photo: null });
      continue;
    }

    const options: PhotoOption[] = [];
    for (const photo of chunkPhotos) {
      const ratio = photo.width / photo.height;
      const photoHeight = leaf.width / ratio;
      if (leaf.height - photoHeight >= layout.minCellSize * 0.48) {
        for (const first of [true, false]) {
          const rect = {
            x: leaf.x,
            y: first ? leaf.y : leaf.y + leaf.height - photoHeight,
            width: leaf.width,
            height: photoHeight,
          };
          if (fitsPhoto(rect)) {
            options.push({
              photo,
              rect,
              direction: "horizontal",
              first,
              at: first ? leaf.y + photoHeight : rect.y,
            });
          }
        }
      }
      const photoWidth = leaf.height * ratio;
      if (leaf.width - photoWidth >= layout.minCellSize * 0.48) {
        for (const first of [true, false]) {
          const rect = {
            x: first ? leaf.x : leaf.x + leaf.width - photoWidth,
            y: leaf.y,
            width: photoWidth,
            height: leaf.height,
          };
          if (fitsPhoto(rect)) {
            options.push({
              photo,
              rect,
              direction: "vertical",
              first,
              at: first ? leaf.x + photoWidth : rect.x,
            });
          }
        }
      }
    }

    if (!options.length) {
      cells.push({ id: cellId("empty"), ...leaf, photo: null });
      continue;
    }
    const fresh = options.filter((option) => !usedPhotos.has(option.photo.id));
    const pool = fresh.length ? fresh : options;
    const chosen = pool[randomInt(random, 0, pool.length - 1)];
    const [first, second] =
      chosen.direction === "vertical"
        ? splitVertical(leaf, chosen.at)
        : splitHorizontal(leaf, chosen.at);
    const imageCell = chosen.first ? first : second;
    const emptyCell = chosen.first ? second : first;
    cells.push({ id: cellId("photo"), ...imageCell, photo: chosen.photo });
    cells.push({ id: cellId("empty"), ...emptyCell, photo: null });
    acceptedPhotos.push(imageCell);
    usedPhotos.add(chosen.photo.id);
  }

  return { key, column, row, x, y, width, height, cells, lines };
}

function rememberChunk(cache: Map<string, GalleryChunk>, chunk: GalleryChunk) {
  cache.delete(chunk.key);
  cache.set(chunk.key, chunk);
  while (cache.size > MAX_CACHED_CHUNKS) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    if (oldest === "0,0") {
      const origin = cache.get(oldest)!;
      cache.delete(oldest);
      cache.set(oldest, origin);
    } else {
      cache.delete(oldest);
    }
  }
}

function readManifest(value: unknown): GalleryPhoto[] {
  if (!value || typeof value !== "object" || !("photos" in value)) return [];
  const entries = (value as { photos?: unknown }).photos;
  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const photo = entry as Partial<GalleryPhoto>;
    if (
      typeof photo.id !== "string" ||
      typeof photo.src !== "string" ||
      typeof photo.width !== "number" ||
      typeof photo.height !== "number" ||
      photo.width <= 0 ||
      photo.height <= 0
    ) {
      return [];
    }
    const source = photo.src.startsWith("/")
      ? photo.src
      : `${import.meta.env.BASE_URL}${photo.src.replace(/^\/+/, "")}`;
    return [{ ...(photo as GalleryPhoto), src: source }];
  });
}

export default function InfiniteGallery({
  motionOff,
  intro = false,
}: {
  motionOff: boolean;
  intro?: boolean;
}) {
  const initialPhase = intro && !motionOff ? "waiting" : "canvas";
  const [phase, setPhase] = useState<"waiting" | "intro" | "canvas">(
    initialPhase,
  );
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photosReady, setPhotosReady] = useState(false);
  const [visibleChunks, setVisibleChunks] = useState<VisibleChunk[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scrollToZoom, setScrollToZoom] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [layout, setLayout] = useState(() =>
    createLayout(window.innerWidth, window.innerHeight),
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
    width: 0,
    height: 0,
  });
  const cameraInitializedRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const inertiaFrameRef = useRef(0);
  const sessionSeedRef = useRef(Math.floor(Math.random() * 0xffffffff));
  const chunkCacheRef = useRef(new Map<string, GalleryChunk>());
  const seenChunksRef = useRef(new Set<string>());
  const visibleSignatureRef = useRef("");
  const refreshRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let active = true;
    fetch(ASSET_MANIFEST_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: unknown) => {
        if (!active) return;
        setPhotos(readManifest(manifest));
      })
      .catch(() => {
        if (active) setPhotos([]);
      })
      .finally(() => {
        if (active) setPhotosReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "canvas") return;
    if (motionOff) {
      setPhase("canvas");
      return;
    }
    if (phase === "waiting") {
      const canvas = canvasRef.current;
      if (!canvas || !window.IntersectionObserver) {
        setPhase("intro");
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.9,
            )
          ) {
            setPhase("intro");
          }
        },
        { threshold: [0, 0.9] },
      );
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    const timer = window.setTimeout(() => setPhase("canvas"), 950);
    return () => window.clearTimeout(timer);
  }, [motionOff, phase]);

  const refreshVisibleChunks = useCallback(() => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    const camera = cameraRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;

    if (!cameraInitializedRef.current) {
      camera.width = width;
      camera.height = height;
      if (phase === "canvas" && photosReady) {
        let openingChunk = chunkCacheRef.current.get("0,0");
        if (!openingChunk) {
          openingChunk = makeChunk(
            sessionSeedRef.current,
            0,
            0,
            photos,
            layout,
          );
        }
        rememberChunk(chunkCacheRef.current, openingChunk);
        const openingPhoto = openingChunk.cells.find((cell) => cell.photo);
        camera.zoom = Math.max(
          MIN_ZOOM,
          Math.min(1, width / 700, height / 450),
        );
        const focusX = openingPhoto
          ? openingPhoto.x + openingPhoto.width / 2
          : layout.pitchX / 2;
        const focusY = openingPhoto
          ? openingPhoto.y + openingPhoto.height / 2
          : layout.pitchY / 2;
        camera.x = width / 2 - focusX * camera.zoom;
        camera.y = height / 2 - focusY * camera.zoom;
        setZoomPercent(Math.round(camera.zoom * 100));
        cameraInitializedRef.current = true;
      }
    } else if (camera.width !== width || camera.height !== height) {
      const centerX = (camera.width / 2 - camera.x) / camera.zoom;
      const centerY = (camera.height / 2 - camera.y) / camera.zoom;
      camera.x = width / 2 - centerX * camera.zoom;
      camera.y = height / 2 - centerY * camera.zoom;
    }
    camera.width = width;
    camera.height = height;
    world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`;

    if (phase !== "canvas" || !photosReady) return;

    const worldLeft = -camera.x / camera.zoom;
    const worldTop = -camera.y / camera.zoom;
    const worldRight = (width - camera.x) / camera.zoom;
    const worldBottom = (height - camera.y) / camera.zoom;
    const bufferX = Math.min(
      layout.pitchX * 0.46,
      (width / camera.zoom) * 0.18,
    );
    const bufferY = Math.min(
      layout.pitchY * 0.46,
      (height / camera.zoom) * 0.18,
    );
    const firstColumn = axisIndex(
      worldLeft - bufferX,
      layout.pitchX,
      sessionSeedRef.current,
      0x673a2b1d,
    );
    const lastColumn = axisIndex(
      worldRight + bufferX,
      layout.pitchX,
      sessionSeedRef.current,
      0x673a2b1d,
    );
    const firstRow = axisIndex(
      worldTop - bufferY,
      layout.pitchY,
      sessionSeedRef.current,
      0x2984c741,
    );
    const lastRow = axisIndex(
      worldBottom + bufferY,
      layout.pitchY,
      sessionSeedRef.current,
      0x2984c741,
    );
    const signature = `${firstColumn}:${lastColumn}:${firstRow}:${lastRow}:${photos.length}`;
    if (signature === visibleSignatureRef.current) return;
    visibleSignatureRef.current = signature;

    const next: VisibleChunk[] = [];
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const key = `${column},${row}`;
        let chunk = chunkCacheRef.current.get(key);
        if (!chunk) {
          chunk = makeChunk(
            sessionSeedRef.current,
            column,
            row,
            photos,
            layout,
          );
        }
        rememberChunk(chunkCacheRef.current, chunk);
        const animate = !seenChunksRef.current.has(key);
        seenChunksRef.current.add(key);
        next.push({ ...chunk, animate });
      }
    }
    setVisibleChunks(next);
  }, [layout, phase, photos, photosReady]);

  refreshRef.current = refreshVisibleChunks;

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;

      const nextLayout = createLayout(width, height);
      if (
        nextLayout.maxZoom !== layout.maxZoom ||
        nextLayout.pitchX !== layout.pitchX ||
        nextLayout.pitchY !== layout.pitchY
      ) {
        const camera = cameraRef.current;
        if (cameraInitializedRef.current) {
          const tileX =
            (camera.width / 2 - camera.x) / camera.zoom / layout.pitchX;
          const tileY =
            (camera.height / 2 - camera.y) / camera.zoom / layout.pitchY;
          camera.zoom = Math.min(camera.zoom, nextLayout.maxZoom);
          camera.x = width / 2 - tileX * nextLayout.pitchX * camera.zoom;
          camera.y = height / 2 - tileY * nextLayout.pitchY * camera.zoom;
          camera.width = width;
          camera.height = height;
          setZoomPercent(Math.round(camera.zoom * 100));
        }
        chunkCacheRef.current.clear();
        seenChunksRef.current.clear();
        visibleSignatureRef.current = "";
        setVisibleChunks([]);
        setLayout(nextLayout);
        return;
      }
      refreshRef.current();
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [layout, phase, photosReady, photos.length, refreshVisibleChunks]);

  useEffect(() => {
    if (!scrollToZoom) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomAtPointer = (event: WheelEvent) => {
      event.preventDefault();
      const camera = cameraRef.current;
      if (!camera.width || !camera.height) return;
      const deltaScale =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? camera.height
            : 1;
      const delta = event.deltaY * deltaScale;
      const nextZoom = Math.max(
        MIN_ZOOM,
        Math.min(layout.maxZoom, camera.zoom * Math.exp(-delta * 0.00022)),
      );
      if (nextZoom === camera.zoom) return;

      const bounds = canvas.getBoundingClientRect();
      const pointerX = event.clientX - bounds.left;
      const pointerY = event.clientY - bounds.top;
      const worldX = (pointerX - camera.x) / camera.zoom;
      const worldY = (pointerY - camera.y) / camera.zoom;
      camera.zoom = nextZoom;
      camera.x = pointerX - worldX * nextZoom;
      camera.y = pointerY - worldY * nextZoom;
      setZoomPercent(Math.round(nextZoom * 100));
      refreshRef.current();
    };

    canvas.addEventListener("wheel", zoomAtPointer, { passive: false });
    return () => canvas.removeEventListener("wheel", zoomAtPointer);
  }, [layout.maxZoom, scrollToZoom]);

  useEffect(
    () => () => {
      cancelAnimationFrame(inertiaFrameRef.current);
    },
    [],
  );

  const panBy = (deltaX: number, deltaY: number) => {
    const camera = cameraRef.current;
    camera.x += deltaX;
    camera.y += deltaY;
    refreshRef.current();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "canvas") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("button, a")) {
      return;
    }
    cancelAnimationFrame(inertiaFrameRef.current);
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocityX: 0,
      velocityY: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.lastX;
    const deltaY = event.clientY - drag.lastY;
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
    drag.velocityX = deltaX / elapsed;
    drag.velocityY = deltaY / elapsed;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    cameraRef.current.x += deltaX;
    cameraRef.current.y += deltaY;
    refreshRef.current();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);

    let velocityX = Math.max(-2.6, Math.min(2.6, drag.velocityX));
    let velocityY = Math.max(-2.6, Math.min(2.6, drag.velocityY));
    let previousTime = performance.now();
    const coast = (time: number) => {
      const elapsed = Math.min(40, time - previousTime);
      previousTime = time;
      const camera = cameraRef.current;
      camera.x += velocityX * elapsed;
      camera.y += velocityY * elapsed;
      const friction = Math.exp(-elapsed / 340);
      velocityX *= friction;
      velocityY *= friction;
      refreshRef.current();
      if (Math.abs(velocityX) > 0.018 || Math.abs(velocityY) > 0.018) {
        inertiaFrameRef.current = requestAnimationFrame(coast);
      }
    };

    if (Math.abs(velocityX) > 0.018 || Math.abs(velocityY) > 0.018) {
      inertiaFrameRef.current = requestAnimationFrame(coast);
    }
  };

  const handleKeyDown = (
    event: import("react").KeyboardEvent<HTMLDivElement>,
  ) => {
    if (phase !== "canvas") return;
    const movement = 90;
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [movement, 0],
      ArrowRight: [-movement, 0],
      ArrowUp: [0, movement],
      ArrowDown: [0, -movement],
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    panBy(direction[0], direction[1]);
  };

  return (
    <div
      ref={canvasRef}
      className={`infinite-gallery${dragging ? " is-dragging" : ""}`}
      data-phase={phase}
      data-lenis-prevent={scrollToZoom || dragging ? "" : undefined}
      aria-label="Infinite photo gallery. Drag to pan, or use the arrow keys."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div ref={worldRef} className="gallery-world">
        {visibleChunks.map((chunk) => (
          <div
            className="gallery-chunk"
            key={chunk.key}
            style={{
              left: chunk.x,
              top: chunk.y,
              width: chunk.width,
              height: chunk.height,
            }}
          >
            {chunk.cells.map((cell) =>
              cell.photo ? (
                <img
                  key={cell.id}
                  className={`gallery-photo${chunk.animate ? " is-entering" : ""}`}
                  src={cell.photo.src}
                  alt={`Photograph ${cell.photo.id.replaceAll("_", " ")}`}
                  decoding="async"
                  draggable={false}
                  style={
                    {
                      left: cell.x,
                      top: cell.y,
                      width: cell.width,
                      height: cell.height,
                      "--photo-delay": `${120 + (cell.y % 4) * 32}ms`,
                    } as CSSProperties
                  }
                />
              ) : null,
            )}
            {chunk.lines.map((line, index) => (
              <span
                aria-hidden="true"
                className={`gallery-grid-line ${line.direction}${chunk.animate ? " is-drawing" : ""}`}
                key={line.id}
                style={
                  {
                    left: line.x,
                    top: line.y,
                    width: line.direction === "horizontal" ? line.length : 1,
                    height: line.direction === "vertical" ? line.length : 1,
                    "--line-delay": `${(index % 12) * 24}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ))}
      </div>

      <div
        className={`gallery-wordmark${phase === "canvas" ? " is-watermark" : " is-opening"}`}
        aria-hidden="true"
      >
        Gallery
      </div>

      <div className="gallery-controls">
        <button
          className="gallery-zoom-toggle mono"
          type="button"
          aria-pressed={scrollToZoom}
          onClick={() => setScrollToZoom((enabled) => !enabled)}
        >
          <span className="zoom-toggle-mark" aria-hidden="true">
            {scrollToZoom ? "●" : "○"}
          </span>
          <span>Scroll to zoom</span>
          <span className="zoom-toggle-state">
            {scrollToZoom ? "ON" : "OFF"}
          </span>
          {scrollToZoom && <span className="zoom-level">{zoomPercent}%</span>}
        </button>
        <span className="gallery-pan-hint mono" aria-hidden="true">
          DRAG TO MOVE
        </span>
      </div>
    </div>
  );
}
