import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  createLayout,
  GalleryWorld,
  selectVisiblePhotos,
  type GalleryCell,
  type GalleryPhoto,
} from "./galleryGeometry";
import { prepareWordmarkIntro } from "./wordmarkIntro";
import GalleryPhotoViewer from "./GalleryPhotoViewer";
import { useAvailableOriginal, useGalleryPreload } from "./useGalleryOriginals";
import { galleryOriginalCache } from "./galleryOriginalCache";

type VisibleCell = GalleryCell & { animate: boolean; inViewport: boolean };

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
  startX: number;
  startY: number;
  moved: boolean;
  photo: GalleryPhoto | null;
  trigger: HTMLElement | null;
};

const MIN_ZOOM = 0.5;
const ASSET_MANIFEST_URL = `${import.meta.env.BASE_URL}gallery-assets/manifest.json`;

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
    const fullSrc =
      typeof photo.fullSrc === "string"
        ? photo.fullSrc.startsWith("/")
          ? photo.fullSrc
          : `${import.meta.env.BASE_URL}${photo.fullSrc}`
        : undefined;
    return [{ ...(photo as GalleryPhoto), src: source, fullSrc }];
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
  const [introStarted, setIntroStarted] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [photosReady, setPhotosReady] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [visibleCells, setVisibleCells] = useState<VisibleCell[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scrollToZoom, setScrollToZoom] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const photoTriggerRef = useRef<HTMLElement | null>(null);
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
  const suppressPhotoClickRef = useRef(false);
  const pendingPhotoClickRef = useRef<{
    photo: GalleryPhoto;
    trigger: HTMLElement | null;
  } | null>(null);
  const inertiaFrameRef = useRef(0);
  const worldGeometryRef = useRef<GalleryWorld | null>(null);
  const seenCellsRef = useRef(new Set<number>());
  const visibleSignatureRef = useRef("");
  const refreshRef = useRef<() => void>(() => undefined);

  useGalleryPreload(photos);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!window.IntersectionObserver) {
      setOnScreen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      setOnScreen(entries.some((entry) => entry.isIntersecting));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (onScreen)
      galleryOriginalCache.prioritize(
        visibleCells.flatMap((cell) =>
          cell.inViewport && cell.photo?.fullSrc ? [cell.photo.fullSrc] : [],
        ),
      );
  }, [visibleCells, onScreen]);

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
    if (motionOff) {
      setIntroStarted(false);
      setPhase("canvas");
      return;
    }
    if (phase === "canvas") return;
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
    prepareWordmarkIntro(canvasRef.current);
    setIntroStarted(true);
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
        let geometry = worldGeometryRef.current;
        if (!geometry) {
          geometry = new GalleryWorld(photos, layout);
          worldGeometryRef.current = geometry;
        }
        geometry.ensureCoverage({
          x: -width / 2,
          y: -height / 2,
          width,
          height,
        });
        const openingPhoto = geometry.cells
          .filter((cell) => cell.photo)
          .sort(
            (a, b) =>
              (a.x + a.width / 2) ** 2 +
              (a.y + a.height / 2) ** 2 -
              ((b.x + b.width / 2) ** 2 + (b.y + b.height / 2) ** 2),
          )[0];
        camera.zoom = Math.max(
          MIN_ZOOM,
          Math.min(1, width / 700, height / 450),
        );
        camera.x =
          width / 2 -
          (openingPhoto ? openingPhoto.x + openingPhoto.width / 2 : 0) *
            camera.zoom;
        camera.y =
          height / 2 -
          (openingPhoto ? openingPhoto.y + openingPhoto.height / 2 : 0) *
            camera.zoom;
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
    let geometry = worldGeometryRef.current;
    if (!geometry) {
      geometry = new GalleryWorld(photos, layout);
      worldGeometryRef.current = geometry;
    }
    const viewport = {
      x: worldLeft,
      y: worldTop,
      width: worldRight - worldLeft,
      height: worldBottom - worldTop,
    };
    geometry.ensureCoverage(viewport);
    const buffer = 300;
    const visible = selectVisiblePhotos(
      geometry.query({
        x: worldLeft - buffer,
        y: worldTop - buffer,
        width: viewport.width + buffer * 2,
        height: viewport.height + buffer * 2,
      }),
      viewport,
    );
    const inViewport = (cell: GalleryCell) =>
      cell.x < worldRight &&
      cell.x + cell.width > worldLeft &&
      cell.y < worldBottom &&
      cell.y + cell.height > worldTop;
    const signature = visible
      .map((cell) => `${cell.id}:${cell.photo?.id ?? ""}:${inViewport(cell)}`)
      .join(",");
    if (signature === visibleSignatureRef.current) return;
    visibleSignatureRef.current = signature;

    setVisibleCells(
      visible.map((cell) => {
        const animate = !seenCellsRef.current.has(cell.id);
        seenCellsRef.current.add(cell.id);
        return { ...cell, animate, inViewport: inViewport(cell) };
      }),
    );
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
        nextLayout.minimum !== layout.minimum
      ) {
        const camera = cameraRef.current;
        if (cameraInitializedRef.current) {
          const centerX = (camera.width / 2 - camera.x) / camera.zoom;
          const centerY = (camera.height / 2 - camera.y) / camera.zoom;
          camera.zoom = Math.min(camera.zoom, nextLayout.maxZoom);
          camera.x = width / 2 - centerX * camera.zoom;
          camera.y = height / 2 - centerY * camera.zoom;
          camera.width = width;
          camera.height = height;
          setZoomPercent(Math.round(camera.zoom * 100));
        }
        worldGeometryRef.current = null;
        seenCellsRef.current.clear();
        visibleSignatureRef.current = "";
        setVisibleCells([]);
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

  const openPhoto = (photo: GalleryPhoto, trigger: HTMLElement | null) => {
    cancelAnimationFrame(inertiaFrameRef.current);
    photoTriggerRef.current = trigger;
    setActivePhoto(photo);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "canvas") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const button =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>("button, a")
        : null;
    if (button && !button.hasAttribute("data-gallery-photo")) {
      return;
    }
    cancelAnimationFrame(inertiaFrameRef.current);
    suppressPhotoClickRef.current = false;
    pendingPhotoClickRef.current = null;
    dragRef.current = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocityX: 0,
      velocityY: 0,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      photo:
        photos.find((photo) => photo.id === button?.dataset.galleryPhoto) ??
        null,
      trigger: button,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (
      !drag.moved &&
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6
    )
      return;
    drag.moved = true;
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
    suppressPhotoClickRef.current =
      drag.moved || event.type === "pointercancel";
    // A drag can still emit a click; allow independent later activations.
    window.setTimeout(() => {
      suppressPhotoClickRef.current = false;
    }, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type === "pointercancel" || !drag.moved) {
      if (event.type !== "pointercancel" && drag.photo)
        pendingPhotoClickRef.current = {
          photo: drag.photo,
          trigger: drag.trigger,
        };
      return;
    }

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
    <>
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
        onClick={() => {
          const pending = pendingPhotoClickRef.current;
          pendingPhotoClickRef.current = null;
          if (pending) openPhoto(pending.photo, pending.trigger);
        }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div ref={worldRef} className="gallery-world">
          {visibleCells.map((cell) => (
            <div
              className="gallery-rect"
              key={cell.id}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
              }}
            >
              {cell.photo && cell.photoFrame && (
                <button
                  type="button"
                  className="gallery-photo-open"
                  data-gallery-photo={cell.photo.id}
                  tabIndex={cell.inViewport ? 0 : -1}
                  aria-label={`Enlarge photograph ${cell.photo.id.replaceAll("_", " ")}`}
                  onClick={(event) => {
                    pendingPhotoClickRef.current = null;
                    if (
                      cell.photo &&
                      (event.detail === 0 || !suppressPhotoClickRef.current)
                    )
                      openPhoto(cell.photo, event.currentTarget);
                  }}
                >
                  <CanvasPhoto
                    photo={cell.photo}
                    animate={cell.animate}
                    useOriginal={onScreen && cell.inViewport}
                  />
                </button>
              )}
              {(["top", "right", "bottom", "left"] as const).map(
                (side, index) => (
                  <span
                    aria-hidden="true"
                    className={`gallery-grid-line ${side === "top" || side === "bottom" ? "horizontal" : "vertical"}${cell.animate ? " is-drawing" : ""}`}
                    key={side}
                    style={
                      {
                        left: side === "right" ? cell.width : 0,
                        top: side === "bottom" ? cell.height : 0,
                        width:
                          side === "top" || side === "bottom" ? cell.width : 1,
                        height:
                          side === "left" || side === "right" ? cell.height : 1,
                        "--line-delay": `${index * 24}ms`,
                      } as CSSProperties
                    }
                  />
                ),
              )}
            </div>
          ))}
        </div>

        <div
          className={`gallery-wordmark${phase === "canvas" ? " is-watermark" : " is-opening"}${introStarted && !motionOff ? " is-enlarging" : ""}`}
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
      <GalleryPhotoViewer
        motionOff={motionOff}
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
        triggerRef={photoTriggerRef}
        fallbackRef={canvasRef}
      />
    </>
  );
}

function CanvasPhoto({
  photo,
  animate,
  useOriginal,
}: {
  photo: GalleryPhoto;
  animate: boolean;
  useOriginal: boolean;
}) {
  const original = useAvailableOriginal(photo.fullSrc, useOriginal);
  const [failedOriginal, setFailedOriginal] = useState<string>();
  return (
    <img
      className={`gallery-photo${animate ? " is-entering" : ""}`}
      src={original && original !== failedOriginal ? original : photo.src}
      alt={`Photograph ${photo.id.replaceAll("_", " ")}`}
      decoding="async"
      draggable={false}
      onError={() => {
        if (original && photo.fullSrc) {
          setFailedOriginal(original);
          void galleryOriginalCache.invalidate(photo.fullSrc);
        }
      }}
      onLoad={async (event) => {
        if (!original || !photo.fullSrc) return;
        const image = event.currentTarget;
        await image.decode().catch(() => undefined);
        galleryOriginalCache.markDecoded(photo.fullSrc, image);
      }}
      style={
        {
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
          "--photo-delay": "120ms",
        } as CSSProperties
      }
    />
  );
}
