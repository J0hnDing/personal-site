import {
  readdir,
  readFile,
  mkdir,
  stat,
  writeFile,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const transformVersion = "webp-1800-q78-v1";
const imagePattern = /\.(jpe?g|png|webp|tiff?)$/i;
const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const digest = (value) => createHash("sha256").update(value).digest("hex");

/** Keep the flat photo contract used by Home, with actual source folders added. */
export async function prepareGallery({ sourceDirectory, outputDirectory }) {
  await mkdir(outputDirectory, { recursive: true });
  const manifestPath = path.join(outputDirectory, "manifest.json");
  const sourceNames = [];
  const folders = [];

  async function visit(relativeDirectory = "") {
    let entries;
    try {
      entries = await readdir(path.join(sourceDirectory, relativeDirectory), {
        withFileTypes: true,
      });
    } catch (error) {
      if (error?.code === "ENOENT" && !relativeDirectory) return;
      throw error;
    }
    entries.sort((a, b) => byName(a.name, b.name));
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      if (entry.isDirectory()) {
        folders.push({
          id: `folders/${relativePath}`,
          title: entry.name,
          parentId: relativeDirectory ? `folders/${relativeDirectory}` : null,
          photoIds: [],
        });
        await visit(relativePath);
      } else if (entry.isFile() && imagePattern.test(entry.name))
        sourceNames.push(relativePath);
    }
  }
  await visit();
  // Root entries come first so their existing IDs and URLs always win.
  sourceNames.sort(
    (a, b) => Number(a.includes("/")) - Number(b.includes("/")) || byName(a, b),
  );

  let previousManifest = null;
  try {
    previousManifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    // A fresh checkout starts with no generated cache.
  }

  const identities = new Map();
  const usedIds = new Set();
  const usedOutputs = new Set();
  for (const name of sourceNames) {
    const stem = path.posix.parse(name).name;
    const nested = name.includes("/");
    let id = nested ? name : stem;
    let output = nested ? `__folders__/${digest(name)}.webp` : `${stem}.webp`;
    if (usedIds.has(id) || usedOutputs.has(output)) {
      id = `${name}-${digest(name)}`;
      output = `__folders__/${digest(`duplicate:${name}`)}.webp`;
    }
    usedIds.add(id);
    usedOutputs.add(output);
    identities.set(name, { id, output });
  }

  const photos = [];
  const records = {};
  for (let index = 0; index < sourceNames.length; index += 3) {
    const results = await Promise.all(
      sourceNames.slice(index, index + 3).map(async (name) => {
        const sourcePath = path.join(sourceDirectory, name);
        const sourceInfo = await stat(sourcePath);
        const { id, output } = identities.get(name);
        const outputPath = path.join(outputDirectory, output);
        const extension = path.posix.extname(name).toLowerCase();
        const isTiff = /\.tiff?$/.test(extension);
        const fullOutput = `__originals__/${digest(name)}${isTiff ? ".png" : extension}`;
        const fullPath = path.join(outputDirectory, fullOutput);
        const oldRecord = previousManifest?.records?.[name];
        let width = oldRecord?.width;
        let height = oldRecord?.height;
        const cacheMatches =
          previousManifest?.transformVersion === transformVersion &&
          oldRecord?.size === sourceInfo.size &&
          oldRecord?.mtimeMs === sourceInfo.mtimeMs &&
          oldRecord?.output === output &&
          width > 0 &&
          height > 0 &&
          (await stat(outputPath).catch(() => null));

        if (!cacheMatches) {
          const metadata = await sharp(sourcePath, {
            failOn: "none",
          }).metadata();
          width = metadata.width;
          height = metadata.height;
          if (!width || !height)
            throw new Error(`Could not read image dimensions for ${name}`);
          if (metadata.orientation && metadata.orientation >= 5)
            [width, height] = [height, width];
          await mkdir(path.dirname(outputPath), { recursive: true });
          await sharp(sourcePath, { failOn: "none" })
            .rotate()
            .resize({
              width: 1800,
              height: 1800,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 78, effort: 4, smartSubsample: true })
            .toFile(outputPath);
        }
        const fullCacheMatches =
          oldRecord?.size === sourceInfo.size &&
          oldRecord?.mtimeMs === sourceInfo.mtimeMs &&
          oldRecord?.fullOutput === fullOutput &&
          (await stat(fullPath).catch(() => null));
        if (!fullCacheMatches) {
          await mkdir(path.dirname(fullPath), { recursive: true });
          // Browser-readable originals are copied unchanged. TIFF keeps every
          // pixel in an oriented, lossless PNG so the viewer can display it.
          if (isTiff)
            await sharp(sourcePath, { failOn: "none" })
              .rotate()
              .png()
              .toFile(fullPath);
          else await copyFile(sourcePath, fullPath);
        }
        const directory = path.posix.dirname(name);
        return {
          name,
          photo: {
            id,
            src: `gallery-assets/${output.split("/").map(encodeURIComponent).join("/")}`,
            fullSrc: `gallery-assets/${fullOutput}?v=${sourceInfo.size.toString(36)}-${Math.trunc(sourceInfo.mtimeMs).toString(36)}`,
            width,
            height,
            name: path.posix.basename(name),
            folderId:
              directory === "." ? "all-photographs" : `folders/${directory}`,
          },
          record: {
            size: sourceInfo.size,
            mtimeMs: sourceInfo.mtimeMs,
            output,
            fullOutput,
            width,
            height,
          },
        };
      }),
    );
    for (const result of results) {
      photos.push(result.photo);
      records[result.name] = result.record;
    }
  }

  const rootPhotos = photos.filter(
    (photo) => photo.folderId === "all-photographs",
  );
  if (rootPhotos.length)
    folders.unshift({
      id: "all-photographs",
      title: "All photographs",
      parentId: null,
      photoIds: rootPhotos.map((photo) => photo.id),
    });
  for (const folder of folders) {
    folder.photoIds = photos
      .filter((photo) => photo.folderId === folder.id)
      .map((photo) => photo.id);
  }
  const manifest = { transformVersion, photos, folders, records };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const manifest = await prepareGallery({
    sourceDirectory: path.join(projectRoot, "photos"),
    outputDirectory: path.join(projectRoot, "public", "gallery-assets"),
  });
  console.log(
    `Prepared ${manifest.photos.length} gallery photo${manifest.photos.length === 1 ? "" : "s"}.`,
  );
}
