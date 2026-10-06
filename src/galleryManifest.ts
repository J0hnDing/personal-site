export type ArchivePhoto = {
  id: string;
  src: string;
  fullSrc?: string;
  width: number;
  height: number;
  name: string;
};

export type GalleryFolder = {
  id: string;
  title: string;
  parentId: string | null;
  photoIds: string[];
};

export type GalleryManifest = {
  photos: ArchivePhoto[];
  folders: GalleryFolder[];
};

export function parseGalleryManifest(
  value: unknown,
  baseUrl = "/",
): GalleryManifest {
  if (
    !value ||
    typeof value !== "object" ||
    !("photos" in value) ||
    !Array.isArray(value.photos)
  ) {
    throw new Error("The gallery manifest is unavailable.");
  }
  const photos: ArchivePhoto[] = value.photos.map((entry: unknown) => {
    if (!entry || typeof entry !== "object")
      throw new Error("Invalid photograph entry.");
    const photo = entry as Record<string, unknown>;
    if (
      typeof photo.id !== "string" ||
      typeof photo.src !== "string" ||
      typeof photo.width !== "number" ||
      typeof photo.height !== "number" ||
      !Number.isFinite(photo.width) ||
      !Number.isFinite(photo.height) ||
      photo.width <= 0 ||
      photo.height <= 0
    )
      throw new Error("Invalid photograph entry.");
    return {
      id: photo.id,
      src: photo.src.startsWith("/") ? photo.src : `${baseUrl}${photo.src}`,
      fullSrc:
        typeof photo.fullSrc === "string"
          ? photo.fullSrc.startsWith("/")
            ? photo.fullSrc
            : `${baseUrl}${photo.fullSrc}`
          : undefined,
      width: photo.width,
      height: photo.height,
      name: typeof photo.name === "string" ? photo.name : photo.id,
    };
  });
  if (new Set(photos.map((photo) => photo.id)).size !== photos.length) {
    throw new Error("Duplicate photograph entries.");
  }
  if (!("folders" in value))
    return {
      photos,
      folders: photos.length
        ? [
            {
              id: "all-photographs",
              title: "All photographs",
              parentId: null,
              photoIds: photos.map((photo) => photo.id),
            },
          ]
        : [],
    };
  if (!Array.isArray(value.folders))
    throw new Error("Invalid gallery folders.");
  const photoIds = new Set(photos.map((photo) => photo.id));
  const folders: GalleryFolder[] = value.folders.map((entry: unknown) => {
    if (!entry || typeof entry !== "object")
      throw new Error("Invalid gallery folder.");
    const folder = entry as Record<string, unknown>;
    if (
      typeof folder.id !== "string" ||
      typeof folder.title !== "string" ||
      !(folder.parentId === null || typeof folder.parentId === "string") ||
      !Array.isArray(folder.photoIds) ||
      !folder.photoIds.every(
        (id: unknown) => typeof id === "string" && photoIds.has(id),
      )
    ) {
      throw new Error("Invalid gallery folder.");
    }
    return {
      id: folder.id,
      title: folder.title,
      parentId: folder.parentId,
      photoIds: folder.photoIds,
    };
  });
  const folderIds = new Set(folders.map((folder) => folder.id));
  if (
    folderIds.size !== folders.length ||
    folders.some(
      (folder) =>
        folder.parentId !== null &&
        (!folderIds.has(folder.parentId) || folder.parentId === folder.id),
    )
  ) {
    throw new Error("Invalid gallery folder hierarchy.");
  }
  return { photos, folders };
}

export function galleryFolderUrl(id: string) {
  return `/gallery/${encodeURIComponent(id)}`;
}

export function galleryFolderPhotoCount(
  folder: GalleryFolder,
  folders: GalleryFolder[],
): number {
  const descendants = [folder.id];
  const visited = new Set<string>();
  let total = 0;
  while (descendants.length) {
    const id = descendants.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const current = folders.find((entry) => entry.id === id);
    if (current) total += current.photoIds.length;
    descendants.push(
      ...folders
        .filter((entry) => entry.parentId === id)
        .map((entry) => entry.id),
    );
  }
  return total;
}
