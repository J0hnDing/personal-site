import { useEffect, useRef, useState, type RefObject } from "react";
import { Link, useParams } from "react-router-dom";
import { profile } from "../content";
import {
  galleryFolderPhotoCount,
  galleryFolderUrl,
  parseGalleryManifest,
  type ArchivePhoto,
  type GalleryFolder,
  type GalleryManifest,
} from "../galleryManifest";
import { ArchiveHeading, ArchiveRow } from "./ArchiveLayout";
import { useOriginalCache } from "../components/useGalleryOriginals";

function useGalleryManifest() {
  const [manifest, setManifest] = useState<GalleryManifest | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setManifest(null);
    setError(false);
    fetch(`${import.meta.env.BASE_URL}gallery-assets/manifest.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load gallery.");
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        if (!controller.signal.aborted)
          setManifest(parseGalleryManifest(value, import.meta.env.BASE_URL));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return { manifest, error, retry: () => setAttempt((value) => value + 1) };
}

function GalleryStatus({
  error,
  retry,
}: {
  error: boolean;
  retry: () => void;
}) {
  return (
    <div className="archive-status" role={error ? "alert" : "status"}>
      <p>
        {error
          ? "The photographs could not be loaded."
          : "Loading photographs…"}
      </p>
      {error && (
        <button type="button" className="archive-text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

function FolderList({
  folders,
  allFolders,
  motionOff,
}: {
  folders: GalleryFolder[];
  allFolders: GalleryFolder[];
  motionOff: boolean;
}) {
  return (
    <ul className="archive-list" aria-label="Photograph folders">
      {folders.map((folder, index) => {
        const count = galleryFolderPhotoCount(folder, allFolders);
        return (
          <ArchiveRow
            key={folder.id}
            to={galleryFolderUrl(folder.id)}
            title={folder.title}
            meta={`${count} photograph${count === 1 ? "" : "s"}`}
            index={String(index + 1).padStart(2, "0")}
            motionOff={motionOff}
          />
        );
      })}
    </ul>
  );
}

export function GalleryIndexContent({ motionOff }: { motionOff: boolean }) {
  const { manifest, error, retry } = useGalleryManifest();
  return (
    <>
      <ArchiveHeading
        title="Gallery"
        eyebrow="Photography"
        intro="Photographs, collected in folders."
        motionOff={motionOff}
      />
      {!manifest ? (
        <GalleryStatus error={error} retry={retry} />
      ) : manifest.folders.length ? (
        <FolderList
          folders={manifest.folders.filter(
            (folder) => folder.parentId === null,
          )}
          allFolders={manifest.folders}
          motionOff={motionOff}
        />
      ) : (
        <p className="archive-status">No photographs have been added yet.</p>
      )}
    </>
  );
}

function PhotographImage({
  photo,
  enlarged = false,
}: {
  photo: ArchivePhoto;
  enlarged?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cache = useOriginalCache();
  const originalKey = photo.fullSrc ?? photo.src;
  const original = enlarged ? cache.getSource(originalKey) : undefined;
  const [loading, setLoading] = useState(!cache.isDecoded(originalKey));
  useEffect(() => {
    if (!enlarged) return;
    let active = true;
    const lease = cache.acquire(originalKey);
    void lease.promise.catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
      lease.release();
    };
  }, [enlarged, cache, originalKey, attempt]);
  if (failed)
    return (
      <div className="archive-photo-error" role="status">
        <p>This photograph could not be loaded.</p>
        <button
          type="button"
          className="archive-text-button"
          onClick={async (event) => {
            event.stopPropagation();
            setLoading(true);
            await cache.invalidate(originalKey);
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        >
          Try again
        </button>
      </div>
    );
  return (
    <div className="archive-original-frame">
      <img
        key={attempt}
        src={original ?? photo.src}
        width={photo.width}
        height={photo.height}
        alt={`Photograph ${photo.name.replace(/\.[^.]+$/, "")}`}
        loading={enlarged ? "eager" : "lazy"}
        decoding="async"
        onLoad={async (event) => {
          if (!original) return;
          const image = event.currentTarget;
          await image.decode().catch(() => undefined);
          cache.markDecoded(originalKey, image);
          setLoading(false);
        }}
        onError={() => setFailed(true)}
      />
      {enlarged && loading && (
        <div className="gallery-viewer-status" role="status">
          <span className="gallery-viewer-spinner" aria-hidden="true" />
          <span className="sr-only">Loading full-resolution photograph…</span>
        </div>
      )}
    </div>
  );
}

function PhotoDialog({
  photos,
  activeIndex,
  onClose,
  onNavigate,
  triggerRef,
}: {
  photos: ArchivePhoto[];
  activeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = activeIndex !== null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open, triggerRef]);
  const photo = activeIndex === null ? null : photos[activeIndex];
  return (
    <dialog
      ref={dialogRef}
      className="archive-photo-dialog"
      aria-label="Enlarged photograph"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (activeIndex === null || photos.length < 2) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onNavigate((activeIndex - 1 + photos.length) % photos.length);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNavigate((activeIndex + 1) % photos.length);
        }
      }}
    >
      {photo && (
        <div className="archive-photo-dialog-content">
          <div className="archive-photo-dialog-toolbar">
            <span aria-live="polite">
              {activeIndex! + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="archive-text-button"
              onClick={onClose}
              autoFocus
            >
              Close
            </button>
          </div>
          <PhotographImage key={photo.id} photo={photo} enlarged />
          {photos.length > 1 && (
            <div className="archive-photo-dialog-navigation">
              <button
                type="button"
                className="archive-text-button"
                onClick={() =>
                  onNavigate((activeIndex! - 1 + photos.length) % photos.length)
                }
              >
                Previous
              </button>
              <button
                type="button"
                className="archive-text-button"
                onClick={() => onNavigate((activeIndex! + 1) % photos.length)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

function PhotographGrid({ photos }: { photos: ArchivePhoto[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <div className="archive-photo-grid">
        {photos.map((photo, index) => (
          <PhotographTile
            key={photo.id}
            photo={photo}
            onOpen={(button) => {
              triggerRef.current = button;
              setActiveIndex(index);
            }}
          />
        ))}
      </div>
      <PhotoDialog
        photos={photos}
        activeIndex={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
        triggerRef={triggerRef}
      />
    </>
  );
}

function PhotographTile({
  photo,
  onOpen,
}: {
  photo: ArchivePhoto;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <figure className="archive-photo">
      {failed ? (
        <div className="archive-photo-error" role="status">
          <p>This photograph could not be loaded.</p>
          <button
            type="button"
            className="archive-text-button"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="archive-photo-open"
          aria-label={`Enlarge photograph ${photo.name}`}
          onClick={(event) => onOpen(event.currentTarget)}
        >
          <img
            key={attempt}
            src={photo.src}
            width={photo.width}
            height={photo.height}
            alt={`Photograph ${photo.name.replace(/\.[^.]+$/, "")}`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        </button>
      )}
      <figcaption className="archive-photo-caption">
        {photo.name.replace(/\.[^.]+$/, "")}
      </figcaption>
    </figure>
  );
}

export function GalleryFolderContent({ motionOff }: { motionOff: boolean }) {
  const { folder: folderId } = useParams<{ folder: string }>();
  const { manifest, error, retry } = useGalleryManifest();
  const folder = manifest?.folders.find((entry) => entry.id === folderId);
  useEffect(() => {
    document.title = `${folder?.title || "Gallery"} — ${profile.name}`;
  }, [folder?.title, folderId]);
  if (!manifest)
    return (
      <>
        <ArchiveHeading title="Gallery" motionOff={motionOff} />
        <GalleryStatus error={error} retry={retry} />
      </>
    );
  if (!folder)
    return (
      <>
        <ArchiveHeading
          title="Folder not found"
          intro="This photograph folder is unavailable."
          motionOff={motionOff}
        />
        <Link className="archive-back" to="/gallery">
          Back to gallery
        </Link>
      </>
    );
  const children = manifest.folders.filter(
    (entry) => entry.parentId === folder.id,
  );
  const photos = manifest.photos.filter((photo) =>
    folder.photoIds.includes(photo.id),
  );
  const parent = manifest.folders.find((entry) => entry.id === folder.parentId);
  return (
    <>
      <Link
        className="archive-back"
        to={parent ? galleryFolderUrl(parent.id) : "/gallery"}
      >
        {parent ? `Back to ${parent.title}` : "Back to gallery"}
      </Link>
      <ArchiveHeading
        title={folder.title}
        eyebrow="Gallery"
        motionOff={motionOff}
      />
      {children.length > 0 && (
        <FolderList
          folders={children}
          allFolders={manifest.folders}
          motionOff={motionOff}
        />
      )}
      {photos.length > 0 && <PhotographGrid key={folder.id} photos={photos} />}
      {!children.length && !photos.length && (
        <p className="archive-status">This folder has no photographs yet.</p>
      )}
    </>
  );
}
