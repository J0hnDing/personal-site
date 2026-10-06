import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../src/components/galleryOriginalCache.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { GalleryOriginalCache } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

const flush = async () => {
  for (let n = 0; n < 3; n++) await new Promise(setImmediate);
};

function fixture({ budget = 1000, persisted = new Map() } = {}) {
  const scheduled = [];
  const requests = [];
  const created = [];
  const revoked = [];
  const store = {
    has: async (key) => persisted.has(key),
    read: async (key) => persisted.get(key),
    put: async (key, blob) => {
      persisted.set(key, blob);
      return true;
    },
    remove: async (key) => {
      persisted.delete(key);
    },
  };
  const cache = new GalleryOriginalCache({
    store,
    sourceBudget: budget,
    schedule: (run) => {
      const task = { run, canceled: false, done: false };
      scheduled.push(task);
      return () => {
        task.canceled = true;
      };
    },
    fetcher: (url, options) =>
      new Promise((resolve, reject) => {
        requests.push({ url, options, resolve, reject });
        options.signal.addEventListener(
          "abort",
          () => reject(options.signal.reason),
          { once: true },
        );
      }),
    createURL: (blob) => {
      const url = `blob:test-${created.length}`;
      created.push({ url, blob });
      return url;
    },
    revokeURL: (url) => revoked.push(url),
  });
  return {
    cache,
    requests,
    persisted,
    store,
    created,
    revoked,
    tick: async () => {
      const next = scheduled.find((task) => !task.done && !task.canceled);
      if (next) {
        next.done = true;
        next.run();
      }
      await flush();
    },
    finish: async (request, content = "original") => {
      request.resolve(
        new Response(new Blob([content], { type: "image/jpeg" })),
      );
      await flush();
    },
  };
}

test("background waits for readiness, runs one low-priority request, prioritizes visible photos, and never decodes", async () => {
  const f = fixture();
  f.cache.prioritize(["three"]);
  f.cache.enqueue(["one", "two", "three", "one"]);
  await f.tick();
  assert.equal(f.requests.length, 0);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  assert.equal(f.requests[0].url, "three");
  assert.equal(f.requests[0].options.priority, "low");
  await f.tick();
  assert.equal(f.requests.length, 1);
  await f.finish(f.requests[0]);
  assert.equal(f.cache.isDownloaded("three"), true);
  assert.equal(f.created.length, 0);
  await f.tick();
  assert.equal(f.requests[1].url, "one");
  f.cache.setBackgroundEnabled(false);
  await flush();
});

test("navigation/hidden-tab suspension cancels scheduled work and aborts active downloads, then resumes", async () => {
  const f = fixture();
  f.cache.enqueue(["one", "two"]);
  f.cache.setBackgroundEnabled(true);
  f.cache.setBackgroundEnabled(false);
  await f.tick();
  assert.equal(f.requests.length, 0);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  f.cache.setBackgroundEnabled(false);
  assert.equal(f.requests[0].options.signal.aborted, true);
  await flush();
  await f.tick();
  assert.equal(f.requests.length, 1);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  assert.equal(f.requests[1].url, "one");
  await f.finish(f.requests[1]);
  await f.tick();
  assert.equal(f.requests[2].url, "two");
  f.cache.setBackgroundEnabled(false);
  await flush();
});

test("a viewer shares an in-flight preload and repeated openings reuse the original source", async () => {
  const f = fixture();
  f.cache.enqueue(["one"]);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  const first = f.cache.acquire("one");
  const second = f.cache.acquire("one");
  f.cache.setBackgroundEnabled(false);
  assert.equal(f.requests[0].options.signal.aborted, false);
  await f.finish(f.requests[0]);
  assert.equal(await first.promise, await second.promise);
  assert.equal(f.requests.length, 1);
  assert.equal(f.created.length, 1);
  const image = {
    naturalWidth: 5568,
    complete: true,
    currentSrc: "blob:test-0",
  };
  f.cache.markDecoded("one", image);
  first.release();
  second.release();
  const reopened = f.cache.acquire("one");
  assert.equal(await reopened.promise, "blob:test-0");
  assert.equal(f.cache.isDecoded("one"), true);
  assert.equal(f.requests.length, 1);
  reopened.release();
  image.currentSrc = "preview.webp";
  assert.equal(f.cache.isDecoded("one"), false);
});

test("opening an uncached image interrupts unrelated background work and gets high priority", async () => {
  const f = fixture();
  f.cache.enqueue(["background", "later"]);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  const viewer = f.cache.acquire("requested");
  await flush();
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.requests[1].url, "requested");
  assert.equal(f.requests[1].options.priority, "high");
  await f.finish(f.requests[1]);
  assert.equal(await viewer.promise, "blob:test-0");
  viewer.release();
  f.cache.setBackgroundEnabled(false);
});

test("persistent files survive a new cache instance and cached display does not interrupt a download", async () => {
  const persisted = new Map([["cached", new Blob(["disk-file"])]]);
  const f = fixture({ persisted });
  f.cache.enqueue(["cached", "background"]);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  assert.equal(f.cache.isDownloaded("cached"), true);
  assert.equal(f.requests.length, 0);
  await f.tick();
  const viewer = f.cache.acquire("cached");
  assert.equal(await viewer.promise, "blob:test-0");
  assert.equal(f.requests[0].options.signal.aborted, false);
  viewer.release();
  f.cache.setBackgroundEnabled(false);
  await flush();
  const nextVisit = fixture({ persisted });
  const next = nextVisit.cache.acquire("cached");
  await next.promise;
  assert.equal(nextVisit.requests.length, 0);
  next.release();
});

test("unneeded sources are evicted under the memory budget; active images stay pinned and decoded retention is bounded", async () => {
  const f = fixture({
    budget: 4,
    persisted: new Map(
      ["one", "two", "three"].map((key) => [key, new Blob(["1234"])]),
    ),
  });
  const one = f.cache.acquire("one");
  const two = f.cache.acquire("two");
  await Promise.all([one.promise, two.promise]);
  assert.equal(f.revoked.length, 0);
  f.cache.markDecoded("one", {
    complete: true,
    naturalWidth: 5568,
    currentSrc: "blob:test-0",
  });
  f.cache.markDecoded("two", {
    complete: true,
    naturalWidth: 5568,
    currentSrc: "blob:test-1",
  });
  assert.equal(f.cache.isDecoded("one"), true);
  f.cache.markDecoded("three", {});
  assert.equal(f.cache.isDecoded("one"), false);
  assert.equal(f.cache.isDecoded("two"), true);
  one.release();
  assert.equal(f.cache.getSource("one"), undefined);
  assert.equal(f.cache.getSource("two"), "blob:test-1");
  assert.deepEqual(f.revoked, ["blob:test-0"]);
  two.release();
});

test("failures preserve the spinner/error fallback, do not loop, and can be retried", async () => {
  const f = fixture();
  f.cache.enqueue(["broken"]);
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  f.requests[0].resolve(new Response("missing", { status: 404 }));
  await flush();
  await f.tick();
  assert.equal(f.requests.length, 1);
  assert.equal(f.cache.isDownloaded("broken"), false);
  const first = f.cache.acquire("broken");
  const failed = assert.rejects(first.promise, /Photograph request failed/);
  await flush();
  f.requests[1].resolve(new Response("missing", { status: 404 }));
  await failed;
  first.release();
  await f.cache.invalidate("broken");
  const retry = f.cache.acquire("broken");
  await flush();
  await f.finish(f.requests[2]);
  assert.equal(await retry.promise, "blob:test-0");
  retry.release();
  f.cache.setBackgroundEnabled(false);
});

test("closing the last foreground consumer off Home cancels its unfinished request", async () => {
  const f = fixture();
  const viewer = f.cache.acquire("one");
  const aborted = assert.rejects(viewer.promise, { name: "AbortError" });
  await flush();
  viewer.release();
  assert.equal(f.requests[0].options.signal.aborted, true);
  await aborted;
  assert.equal(f.cache.isDownloaded("one"), false);
});

test("concurrent viewers share the fallback when the browser evicts a cached file", async () => {
  const f = fixture({ persisted: new Map([["one", new Blob(["disk-file"])]]) });
  f.store.read = async () => {
    f.persisted.delete("one");
    f.store.read = async (key) => f.persisted.get(key);
    return undefined;
  };
  const first = f.cache.acquire("one");
  const second = f.cache.acquire("one");
  await flush();
  assert.equal(f.requests.length, 1);
  await f.finish(f.requests[0]);
  assert.equal(await first.promise, await second.promise);
  assert.equal(f.created.length, 1);
  first.release();
  second.release();
});

test("a released foreground request becomes resumable background work", async () => {
  const f = fixture();
  f.cache.setBackgroundEnabled(true);
  const viewer = f.cache.acquire("one");
  const aborted = assert.rejects(viewer.promise, { name: "AbortError" });
  await flush();
  viewer.release();
  f.cache.setBackgroundEnabled(false);
  await aborted;
  f.cache.setBackgroundEnabled(true);
  await f.tick();
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].url, "one");
  assert.equal(f.requests[1].options.priority, "low");
  await f.finish(f.requests[1]);
  f.cache.setBackgroundEnabled(false);
});
