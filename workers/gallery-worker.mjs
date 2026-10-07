const prefix = "/gallery-assets/__originals__/";
const types = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function matchesEtag(value, etag) {
  return value?.split(",").some((item) => {
    const tag = item.trim();
    return tag === "*" || tag.replace(/^W\//, "") === etag;
  });
}

function failure(status, message, extra = {}) {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "no-store", ...extra },
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(prefix)) return env.ASSETS.fetch(request);
    if (request.method !== "GET" && request.method !== "HEAD")
      return failure(405, "Method not allowed", { Allow: "GET, HEAD" });
    const filename = url.pathname.slice(prefix.length);
    const match = /^[a-f0-9]{64}\.(jpg|jpeg|png|webp)$/.exec(filename);
    if (!match) return failure(404, "Original not found");

    // A content-addressed filename identifies immutable bytes. Ignore old
    // query-string versions when looking up the edge cache.
    const cacheKey = new Request(`${url.origin}${url.pathname}`);
    const cache = globalThis.caches?.default;
    const conditional = request.headers.get("If-None-Match");
    try {
      if (cache && request.method === "GET") {
        const cached = await cache.match(cacheKey).catch(() => null);
        if (cached) {
          if (matchesEtag(conditional, cached.headers.get("ETag"))) {
            // A cached response can be a tee of another stream. Cancellation
            // must not delay the 304 while another reader holds that stream.
            cached.body?.cancel().catch(() => {});
            return new Response(null, {
              status: 304,
              headers: {
                ETag: cached.headers.get("ETag"),
                "Cache-Control": cached.headers.get("Cache-Control"),
              },
            });
          }
          return cached;
        }
      }
      const key = `__originals__/${filename}`;
      const object =
        request.method === "HEAD"
          ? await env.GALLERY_ORIGINALS.head(key)
          : await env.GALLERY_ORIGINALS.get(key);
      if (!object) return failure(404, "Original not found");
      const headers = new Headers({
        "Content-Type": types[match[1]],
        "Content-Length": String(object.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: object.httpEtag,
        "X-Content-Type-Options": "nosniff",
      });
      if (matchesEtag(conditional, object.httpEtag)) {
        object.body?.cancel().catch(() => {});
        headers.delete("Content-Length");
        return new Response(null, { status: 304, headers });
      }
      const response = new Response(
        request.method === "HEAD" ? null : object.body,
        { headers },
      );
      if (cache && context?.waitUntil && request.method === "GET")
        context.waitUntil(
          cache.put(cacheKey, response.clone()).catch(() => {}),
        );
      return response;
    } catch {
      return failure(503, "Original temporarily unavailable", {
        "Retry-After": "5",
      });
    }
  },
};
