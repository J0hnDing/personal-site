import { readdir, readFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectRoot, "photos");
const outputDirectory = path.join(projectRoot, "public", "gallery-assets");
const manifestPath = path.join(outputDirectory, "manifest.json");
const transformVersion = "webp-1800-q78-v1";

await mkdir(outputDirectory, { recursive: true });

let sourceNames = [];
try {
  sourceNames = (await readdir(sourceDirectory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() && /\.(jpe?g|png|webp|tiff?)$/i.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

let previousManifest = null;
try {
  previousManifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  // A fresh checkout or an empty source folder starts with no generated cache.
}

const photos = [];
const batches = [];
for (let index = 0; index < sourceNames.length; index += 3) {
  batches.push(sourceNames.slice(index, index + 3));
}

for (const batch of batches) {
  const results = await Promise.all(
    batch.map(async (name) => {
      const sourcePath = path.join(sourceDirectory, name);
      const sourceInfo = await stat(sourcePath);
      const id = path.parse(name).name;
      const outputName = `${id}.webp`;
      const outputPath = path.join(outputDirectory, outputName);
      const oldRecord = previousManifest?.records?.[name];
      let width = oldRecord?.width;
      let height = oldRecord?.height;
      const cacheMatches =
        previousManifest?.transformVersion === transformVersion &&
        oldRecord?.size === sourceInfo.size &&
        oldRecord?.mtimeMs === sourceInfo.mtimeMs &&
        oldRecord?.output === outputName &&
        (await stat(outputPath).catch(() => null));

      if (!cacheMatches) {
        const image = sharp(sourcePath, { failOn: "none" });
        const metadata = await image.metadata();
        width = metadata.width;
        height = metadata.height;
        if (!width || !height) {
          throw new Error(`Could not read image dimensions for ${name}`);
        }
        if (metadata.orientation && metadata.orientation >= 5) {
          [width, height] = [height, width];
        }

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

      const aspectWidth = width ?? oldRecord?.width;
      const aspectHeight = height ?? oldRecord?.height;
      if (!aspectWidth || !aspectHeight) {
        throw new Error(`Could not read cached dimensions for ${name}`);
      }

      return {
        sourceName: name,
        photo: {
          id,
          src: `gallery-assets/${encodeURIComponent(id)}.webp`,
          width: aspectWidth,
          height: aspectHeight,
        },
        record: {
          size: sourceInfo.size,
          mtimeMs: sourceInfo.mtimeMs,
          output: outputName,
          width: aspectWidth,
          height: aspectHeight,
        },
      };
    }),
  );
  photos.push(...results.map((result) => result.photo));
  for (const result of results) {
    previousManifest ??= {};
    previousManifest.records ??= {};
    previousManifest.records[result.sourceName] = result.record;
  }
}

const manifest = {
  transformVersion,
  photos,
  records: previousManifest?.records ?? {},
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${photos.length} gallery photo${photos.length === 1 ? "" : "s"}.`);
