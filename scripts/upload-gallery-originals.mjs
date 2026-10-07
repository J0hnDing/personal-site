import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import ts from "typescript";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const types = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const digest = (value) => createHash("sha256").update(value).digest("hex");

export function galleryBucket(configText) {
  // Wrangler uses JSONC, including comments and trailing commas. Reuse the
  // project's TypeScript parser instead of treating its config as strict JSON.
  const { config, error } = ts.parseConfigFileTextToJson(
    "wrangler.jsonc",
    configText,
  );
  if (error) throw new Error("Could not parse wrangler.jsonc.");
  const bucket = config?.r2_buckets?.find(
    (entry) => entry.binding === "GALLERY_ORIGINALS",
  )?.bucket_name;
  if (!bucket)
    throw new Error("GALLERY_ORIGINALS is missing from wrangler.jsonc.");
  return bucket;
}

export async function galleryUploads({ outputDirectory, manifest }) {
  if (manifest.originalVersion !== "content-addressed-v1" || !manifest.records)
    throw new Error("Prepare the gallery before uploading originals.");
  const uploads = [];
  const seen = new Set();
  for (const [name, record] of Object.entries(manifest.records)) {
    const match = /^__originals__\/([a-f0-9]{64})\.(jpg|jpeg|png|webp)$/.exec(
      record.fullOutput,
    );
    if (!match) throw new Error(`Invalid original output for ${name}`);
    const filename = path.join(outputDirectory, record.fullOutput);
    const bytes = await readFile(filename);
    if (digest(`${name}:${digest(bytes)}`) !== match[1])
      throw new Error(
        `Original content changed for ${name}; prepare the gallery again.`,
      );
    if (seen.has(record.fullOutput)) continue;
    seen.add(record.fullOutput);
    uploads.push({
      key: record.fullOutput,
      filename,
      contentType: types[match[2]],
      size: (await stat(filename)).size,
    });
  }
  return uploads;
}

function wrangler(args) {
  return new Promise((resolve, reject) => {
    // Invoke Node directly on every platform; never interpolate shell commands
    // or read credentials. Wrangler uses its existing login or CI environment.
    const child = spawn(
      process.execPath,
      [
        path.join(projectRoot, "node_modules/wrangler/bin/wrangler.js"),
        ...args,
      ],
      {
        cwd: projectRoot,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Wrangler exited with code ${code}`)),
    );
  });
}

export async function uploadGallery({ local = false } = {}) {
  const bucket = galleryBucket(
    await readFile(path.join(projectRoot, "wrangler.jsonc"), "utf8"),
  );
  const outputDirectory = path.join(projectRoot, "public/gallery-assets");
  const manifest = JSON.parse(
    await readFile(path.join(outputDirectory, "manifest.json"), "utf8"),
  );
  const uploads = await galleryUploads({ outputDirectory, manifest });
  if (!local) await wrangler(["r2", "bucket", "info", bucket]);
  for (const [index, entry] of uploads.entries()) {
    console.log(
      `Uploading original ${index + 1}/${uploads.length}: ${entry.key}`,
    );
    await wrangler([
      "r2",
      "object",
      "put",
      `${bucket}/${entry.key}`,
      "--file",
      entry.filename,
      "--content-type",
      entry.contentType,
      "--cache-control",
      "public, max-age=31536000, immutable",
      local ? "--local" : "--remote",
      "--storage-class",
      "Standard",
    ]);
  }
  console.log(
    `Uploaded ${uploads.length} originals to ${local ? "local " : ""}R2 bucket ${bucket}.`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--local"))
    throw new Error("Only --local is supported.");
  await uploadGallery({ local: args.includes("--local") });
}
