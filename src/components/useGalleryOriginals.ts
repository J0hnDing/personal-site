import { useEffect, useSyncExternalStore } from "react";
import {
  galleryOriginalCache as originals,
  galleryOriginalStore,
} from "./galleryOriginalCache";
import type { GalleryPhoto } from "./galleryGeometry";

export function useOriginalCache() {
  useSyncExternalStore(originals.subscribe, originals.snapshot);
  return originals;
}

/** Home mounts during the intro; network work waits for essential assets/fonts. */
export function useGalleryPreload(photos: GalleryPhoto[]) {
  useEffect(() => {
    if (!photos.length) return;
    let active = true;
    let ready = false;
    const sources = photos.flatMap((photo) =>
      photo.fullSrc ? [photo.fullSrc] : [],
    );
    const update = () =>
      originals.setBackgroundEnabled(active && ready && !document.hidden);
    const start = async () => {
      await document.fonts.ready.catch(() => undefined);
      if (!active) return;
      await galleryOriginalStore.retain(sources).catch(() => undefined);
      if (!active) return;
      originals.enqueue(sources);
      ready = true;
      update();
    };
    if (document.readyState === "complete") void start();
    else window.addEventListener("load", start, { once: true });
    document.addEventListener("visibilitychange", update);
    const suspend = () => originals.setBackgroundEnabled(false);
    window.addEventListener("pagehide", suspend);
    window.addEventListener("pageshow", update);
    return () => {
      active = false;
      window.removeEventListener("load", start);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("pagehide", suspend);
      window.removeEventListener("pageshow", update);
      suspend();
    };
  }, [photos]);
}

/** Only displayed photos get blob URLs and decoded pixels, never the whole cache. */
export function useAvailableOriginal(
  source: string | undefined,
  enabled: boolean,
) {
  const cache = useOriginalCache();
  const downloaded = !!source && cache.isDownloaded(source);
  const available = source ? cache.getSource(source) : undefined;
  useEffect(() => {
    if (!source || !enabled) return;
    let active = true;
    let lease: ReturnType<typeof cache.acquire> | undefined;
    const showCached = async () => {
      // Revisit photos can already be on disk before the preload queue reaches them.
      if (
        !available &&
        !downloaded &&
        !(await galleryOriginalStore.has(source))
      )
        return;
      if (!active) return;
      lease = cache.acquire(source);
      await lease.promise;
    };
    void showCached().catch(() => undefined);
    return () => {
      active = false;
      lease?.release();
    };
  }, [source, enabled, downloaded, available, cache]);
  return enabled ? available : undefined;
}
