import {
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type CSSProperties,
} from "react";
import type { GalleryPhoto } from "./galleryGeometry";
import "./gallery-photo-viewer.css";
import { useOriginalCache } from "./useGalleryOriginals";

const transitionDuration = 420;
const transitionEasing = "cubic-bezier(0.22, 1, 0.36, 1)";
function transformFrom(rect: DOMRect, destination: DOMRect) {
  return `translate(${rect.x - destination.x}px, ${rect.y - destination.y}px) scale(${rect.width / destination.width}, ${rect.height / destination.height})`;
}

export default function GalleryPhotoViewer({
  photo,
  motionOff,
  onClose,
  triggerRef,
  fallbackRef,
}: {
  photo: GalleryPhoto | null;
  motionOff: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  fallbackRef: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const originRef = useRef<DOMRect | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const open = photo !== null;
  const reduceMotion = () =>
    motionOff || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const frame = frameRef.current;
    if (!dialog || !frame || !open) return;
    const trigger = triggerRef.current;
    originRef.current = trigger?.getBoundingClientRect() ?? null;
    closingRef.current = false;
    setClosing(false);
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const visibility = trigger?.style.visibility;
    if (trigger) trigger.style.visibility = "hidden";
    const origin = originRef.current;
    if (!reduceMotion() && origin?.width && origin.height) {
      animationRef.current = frame.animate(
        [
          { transform: transformFrom(origin, frame.getBoundingClientRect()) },
          { transform: "none" },
        ],
        { duration: transitionDuration, easing: transitionEasing },
      );
    }
    return () => {
      animationRef.current?.cancel();
      animationRef.current = null;
      dialog.close();
      document.body.style.overflow = overflow;
      if (trigger && visibility !== undefined)
        trigger.style.visibility = visibility;
      const target = trigger?.isConnected ? trigger : fallbackRef.current;
      target?.focus({ preventScroll: true });
    };
  }, [open, motionOff, triggerRef, fallbackRef]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const frame = frameRef.current;
    const trigger = triggerRef.current;
    const origin = trigger?.isConnected
      ? trigger.getBoundingClientRect()
      : originRef.current;
    if (!frame || !origin?.width || !origin.height || reduceMotion()) {
      onClose();
      return;
    }
    const current = frame.getBoundingClientRect();
    animationRef.current?.cancel();
    const destination = frame.getBoundingClientRect();
    setClosing(true);
    const animation = frame.animate(
      [
        { transform: transformFrom(current, destination) },
        { transform: transformFrom(origin, destination) },
      ],
      { duration: 300, easing: transitionEasing, fill: "forwards" },
    );
    animationRef.current = animation;
    void animation.finished.then(onClose).catch(() => undefined);
  };
  return (
    <dialog
      ref={dialogRef}
      className="gallery-photo-viewer"
      data-closing={closing ? "true" : undefined}
      aria-label="Full-resolution photograph"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {photo && (
        <div
          ref={frameRef}
          className="gallery-viewer-frame"
          style={
            { "--photo-ratio": photo.width / photo.height } as CSSProperties
          }
        >
          <ViewerImage key={photo.id} photo={photo} />
        </div>
      )}
      <button
        type="button"
        className="gallery-viewer-close mono"
        onClick={close}
        autoFocus
        aria-label="Close photograph"
      >
        Close ×
      </button>
    </dialog>
  );
}

function ViewerImage({ photo }: { photo: GalleryPhoto }) {
  const cache = useOriginalCache();
  const fullSource = photo.fullSrc ?? photo.src;
  const source = cache.getSource(fullSource);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    cache.isDecoded(fullSource) ? "loaded" : "loading",
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const lease = cache.acquire(fullSource);
    void lease.promise.catch(() => {
      if (active) setStatus("failed");
    });
    return () => {
      active = false;
      lease.release();
    };
  }, [cache, fullSource, attempt]);
  return (
    <>
      <img
        className="gallery-viewer-preview"
        src={photo.src}
        alt=""
        aria-hidden="true"
      />
      {source && (
        <img
          key={attempt}
          className={`gallery-viewer-image${status === "loaded" ? " is-loaded" : ""}`}
          src={source}
          width={photo.width}
          height={photo.height}
          alt={`Photograph ${photo.id.replaceAll("_", " ")}`}
          decoding="async"
          onLoad={async (event) => {
            const image = event.currentTarget;
            await image.decode().catch(() => undefined);
            cache.markDecoded(fullSource, image);
            setStatus("loaded");
          }}
          onError={() => setStatus("failed")}
        />
      )}
      {status !== "loaded" && (
        <div className="gallery-viewer-status" role="status">
          {status === "loading" ? (
            <>
              <span className="gallery-viewer-spinner" aria-hidden="true" />
              <span className="sr-only">
                Loading full-resolution photograph…
              </span>
            </>
          ) : (
            <div className="gallery-viewer-error">
              <p>This photograph could not be loaded.</p>
              <button
                type="button"
                onClick={async () => {
                  setStatus("loading");
                  await cache.invalidate(fullSource);
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
