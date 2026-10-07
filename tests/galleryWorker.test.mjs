import assert from "node:assert/strict";
import test from "node:test";
import worker from "../workers/gallery-worker.mjs";

const filename = `${"a".repeat(64)}.png`;
const url = `https://example.com/gallery-assets/__originals__/${filename}`;
const bytes = new Uint8Array([1, 2, 3, 4]);
function fixture() {
  const calls = [];
  const meta = { size: bytes.length, httpEtag: '"etag"' };
  const env = {
    ASSETS: { fetch: async () => new Response("SPA") },
    GALLERY_ORIGINALS: {
      get: async (key) => {
        calls.push(["get", key]);
        return { ...meta, body: new Blob([bytes]).stream() };
      },
      head: async (key) => {
        calls.push(["head", key]);
        return meta;
      },
    },
  };
  return { calls, env };
}

test("originals stream unchanged with immutable cache and correct image headers", async () => {
  const { calls, env } = fixture();
  const response = await worker.fetch(new Request(url), env);
  assert.equal(response.status, 200);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.deepEqual(calls, [["get", `__originals__/${filename}`]]);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("content-length"), "4");
  assert.equal(response.headers.get("etag"), '"etag"');
  assert.match(response.headers.get("cache-control"), /immutable/);
  assert.equal(response.headers.get("accept-ranges"), null);
});

test("HEAD uses only metadata and conditional reads handle weak, list and wildcard ETags", async () => {
  const { calls, env } = fixture();
  const head = await worker.fetch(new Request(url, { method: "HEAD" }), env);
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("content-length"), "4");
  assert.deepEqual(calls, [["head", `__originals__/${filename}`]]);
  for (const tag of ['W/"etag"', '"other", "etag"', "*"]) {
    const response = await worker.fetch(
      new Request(url, { headers: { "If-None-Match": tag } }),
      env,
    );
    assert.equal(response.status, 304);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("content-length"), null);
  }
  const changed = await worker.fetch(
    new Request(url, { headers: { "If-None-Match": '"other"' } }),
    env,
  );
  assert.equal(changed.status, 200);
});

test("invalid, absent and unavailable originals never return SPA HTML or cache errors", async () => {
  const { calls, env } = fixture();
  for (const suffix of [
    "no.png",
    `${"a".repeat(64)}.svg`,
    `${filename}/secret`,
    "%2e%2e%2fsecret",
  ]) {
    const response = await worker.fetch(
      new Request(`https://example.com/gallery-assets/__originals__/${suffix}`),
      env,
    );
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls.length, 0);
  const denied = await worker.fetch(
    new Request(url, { method: "PUT", body: "bad" }),
    env,
  );
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get("allow"), "GET, HEAD");
  env.GALLERY_ORIGINALS.get = async () => null;
  assert.equal((await worker.fetch(new Request(url), env)).status, 404);
  env.GALLERY_ORIGINALS.get = async () => {
    throw new Error("offline");
  };
  const retry = await worker.fetch(new Request(url), env);
  assert.equal(retry.status, 503);
  assert.equal(retry.headers.get("cache-control"), "no-store");
  assert.equal(retry.headers.get("retry-after"), "5");
  assert.equal(
    await (
      await worker.fetch(new Request("https://example.com/about"), env)
    ).text(),
    "SPA",
  );
});

test("edge cache reuses streamed originals and still honors conditional requests", async (t) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "caches");
  const entries = new Map();
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: {
      default: {
        match: async (request) => entries.get(request.url)?.clone(),
        put: async (request, response) => {
          entries.set(request.url, response);
        },
      },
    },
  });
  t.after(() =>
    previous
      ? Object.defineProperty(globalThis, "caches", previous)
      : delete globalThis.caches,
  );
  const { calls, env } = fixture();
  const pending = [];
  const context = { waitUntil: (promise) => pending.push(promise) };
  const first = await worker.fetch(new Request(url), env, context);
  await first.arrayBuffer();
  await Promise.all(pending);
  const second = await worker.fetch(new Request(`${url}?v=old`), env, context);
  assert.deepEqual(new Uint8Array(await second.arrayBuffer()), bytes);
  const unchanged = await worker.fetch(
    new Request(url, { headers: { "If-None-Match": 'W/"etag"' } }),
    env,
    context,
  );
  assert.equal(unchanged.status, 304);
  assert.equal(calls.length, 1);
  globalThis.caches.default.match = async () => {
    throw new Error("cache unavailable");
  };
  assert.equal((await worker.fetch(new Request(url), env)).status, 200);
});
