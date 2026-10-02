import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import ts from "typescript";
import { prepareGallery } from "../scripts/prepare-gallery-assets.mjs";

const source = await readFile(
  new URL("../src/galleryManifest.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { parseGalleryManifest, galleryFolderUrl, galleryFolderPhotoCount } =
  await import(
    `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
  );

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-site-gallery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDirectory = path.join(root, "photos");
  const outputDirectory = path.join(root, "output");
  await mkdir(sourceDirectory);
  return { sourceDirectory, outputDirectory };
}

async function photo(directory, name, width = 30, height = 20) {
  const filename = path.join(directory, name);
  await mkdir(path.dirname(filename), { recursive: true });
  await sharp({
    create: { width, height, channels: 3, background: "#778899" },
  }).toFile(filename);
}

test("recursive real folders preserve root IDs and avoid duplicate filename collisions", async (t) => {
  const options = await fixture(t);
  await photo(options.sourceDirectory, "DSC_001.jpg");
  await photo(options.sourceDirectory, "Travel/DSC_001.jpg", 20, 30);
  await photo(options.sourceDirectory, "Travel/Nested/DSC_001.jpg", 25, 25);
  await photo(options.sourceDirectory, "Family/DSC_001.jpg");
  await photo(options.sourceDirectory, "all-photographs/DSC_001.jpg");
  await mkdir(path.join(options.sourceDirectory, "Empty"));
  const manifest = await prepareGallery(options);
  assert.equal(manifest.photos.length, 5);
  assert.equal(new Set(manifest.photos.map((entry) => entry.id)).size, 5);
  assert.equal(new Set(manifest.photos.map((entry) => entry.src)).size, 5);
  assert.deepEqual(manifest.photos[0], {
    id: "DSC_001",
    src: "gallery-assets/DSC_001.webp",
    width: 30,
    height: 20,
    name: "DSC_001.jpg",
    folderId: "all-photographs",
  });
  const root = manifest.folders.find((entry) => entry.id === "all-photographs");
  assert.deepEqual(root.photoIds, ["DSC_001"]);
  const nested = manifest.folders.find(
    (entry) => entry.id === "folders/Travel/Nested",
  );
  assert.equal(nested.parentId, "folders/Travel");
  assert.deepEqual(nested.photoIds, ["Travel/Nested/DSC_001.jpg"]);
  assert.ok(
    manifest.folders.some((entry) => entry.id === "folders/all-photographs"),
  );
  assert.deepEqual(
    manifest.folders.find((entry) => entry.id === "folders/Empty").photoIds,
    [],
  );
  assert.equal(
    galleryFolderPhotoCount(
      manifest.folders.find((entry) => entry.id === "folders/Travel"),
      manifest.folders,
    ),
    2,
  );
  assert.equal(
    galleryFolderUrl(nested.id),
    "/gallery/folders%2FTravel%2FNested",
  );
  const parsed = parseGalleryManifest(manifest, "/portfolio/");
  assert.equal(parsed.photos[0].src, "/portfolio/gallery-assets/DSC_001.webp");
});

test("same-stem root extensions stay collision-safe and cache each relative source independently", async (t) => {
  const options = await fixture(t);
  await photo(options.sourceDirectory, "same.jpg");
  await photo(options.sourceDirectory, "same.png", 20, 30);
  await photo(options.sourceDirectory, "Nested/same.jpg", 25, 25);
  const first = await prepareGallery(options);
  assert.equal(new Set(first.photos.map((entry) => entry.id)).size, 3);
  assert.equal(new Set(first.photos.map((entry) => entry.src)).size, 3);
  const before = await Promise.all(
    Object.values(first.records).map((entry) =>
      stat(path.join(options.outputDirectory, entry.output)),
    ),
  );
  const second = await prepareGallery(options);
  const after = await Promise.all(
    Object.values(second.records).map((entry) =>
      stat(path.join(options.outputDirectory, entry.output)),
    ),
  );
  assert.deepEqual(
    after.map((entry) => entry.mtimeMs),
    before.map((entry) => entry.mtimeMs),
  );
  await unlink(path.join(options.sourceDirectory, "Nested/same.jpg"));
  const third = await prepareGallery(options);
  assert.equal(third.photos.length, 2);
  assert.equal(third.records["Nested/same.jpg"], undefined);
});

test("legacy manifests receive one factual loose-photo folder; empty and invalid manifests differ", () => {
  const photo = {
    id: "one",
    src: "gallery-assets/one.webp",
    width: 20,
    height: 30,
  };
  const legacy = parseGalleryManifest({ photos: [photo] });
  assert.deepEqual(legacy.folders, [
    {
      id: "all-photographs",
      title: "All photographs",
      parentId: null,
      photoIds: ["one"],
    },
  ]);
  assert.deepEqual(parseGalleryManifest({ photos: [] }), {
    photos: [],
    folders: [],
  });
  assert.throws(() => parseGalleryManifest(null));
  assert.throws(() =>
    parseGalleryManifest({ photos: [{ ...photo, width: Infinity }] }),
  );
  assert.throws(() =>
    parseGalleryManifest({
      photos: [photo],
      folders: [
        {
          id: "broken",
          title: "Broken",
          parentId: null,
          photoIds: ["missing"],
        },
      ],
    }),
  );
});

test("missing source folder produces an empty archive", async (t) => {
  const options = await fixture(t);
  await rm(options.sourceDirectory, { recursive: true });
  const manifest = await prepareGallery(options);
  assert.deepEqual(manifest.photos, []);
  assert.deepEqual(manifest.folders, []);
});
