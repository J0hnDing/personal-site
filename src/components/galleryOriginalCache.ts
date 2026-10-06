export interface OriginalStore {
  has(source: string): Promise<boolean>;
  read(source: string): Promise<Blob | undefined>;
  put(source: string, blob: Blob): Promise<boolean>;
  remove(source: string): Promise<void>;
}

const memoryBudget = 32 * 1024 * 1024;

/** Compressed files live on disk; storage restrictions get a bounded fallback. */
class BrowserOriginalStore implements OriginalStore {
  private cache: Promise<Cache | null> | undefined;
  private fallback = new Map<string, Blob>();

  private open() {
    return (this.cache ??=
      typeof caches === "undefined"
        ? Promise.resolve(null)
        : caches.open("john-gallery-originals-v1").catch(() => null));
  }

  async has(source: string) {
    const cache = await this.open();
    return (
      this.fallback.has(source) ||
      !!(await cache?.match(source).catch(() => undefined))
    );
  }

  async read(source: string) {
    const memory = this.fallback.get(source);
    if (memory) return memory;
    const cache = await this.open();
    const response = await cache?.match(source).catch(() => undefined);
    return response?.blob().catch(() => undefined);
  }

  async put(source: string, blob: Blob) {
    const cache = await this.open();
    if (cache) {
      try {
        await cache.put(source, new Response(blob));
        return true;
      } catch {
        /* Quota/private-mode failures must not interrupt browsing. */
      }
    }
    if (blob.size > memoryBudget) return false;
    this.fallback.delete(source);
    this.fallback.set(source, blob);
    let bytes = [...this.fallback.values()].reduce(
      (sum, item) => sum + item.size,
      0,
    );
    for (const [key, item] of this.fallback) {
      if (bytes <= memoryBudget) break;
      this.fallback.delete(key);
      bytes -= item.size;
    }
    return true;
  }

  async remove(source: string) {
    this.fallback.delete(source);
    const cache = await this.open();
    await cache?.delete(source).catch(() => undefined);
  }

  async retain(sources: string[]) {
    const cache = await this.open();
    if (!cache) return;
    const current = new Set(
      sources.map((source) => new URL(source, location.href).href),
    );
    const keys = await cache.keys().catch(() => []);
    await Promise.all(
      keys
        .filter((key) => !current.has(key.url))
        .map((key) => cache.delete(key)),
    );
  }
}

function scheduleIdle(work: () => void) {
  let idle: number | undefined;
  const timer = window.setTimeout(() => {
    if ("requestIdleCallback" in window)
      idle = window.requestIdleCallback(work);
    else work();
  }, 200);
  return () => {
    window.clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}

type Download = {
  controller: AbortController;
  background: boolean;
  promise: Promise<void>;
};
type Source = { url: string; size: number };
type Options = {
  store: OriginalStore;
  fetcher?: typeof fetch;
  schedule?: typeof scheduleIdle;
  createURL?: (blob: Blob) => string;
  revokeURL?: (url: string) => void;
  sourceBudget?: number;
};

/** One idle background request; foreground users share requests and pin sources. */
export class GalleryOriginalCache {
  private store: OriginalStore;
  private fetcher: typeof fetch;
  private schedule: typeof scheduleIdle;
  private createURL: (blob: Blob) => string;
  private revokeURL: (url: string) => void;
  private sourceBudget: number;
  private queue: string[] = [];
  private preferred = new Set<string>();
  private enabled = false;
  private cancelScheduled: (() => void) | null = null;
  private downloads = new Map<string, Download>();
  private downloaded = new Set<string>();
  private sources = new Map<string, Source>();
  private sourceReads = new Map<string, Promise<string>>();
  private consumers = new Map<string, number>();
  private decoded = new Map<string, HTMLImageElement>();
  private listeners = new Set<() => void>();
  private revision = 0;

  constructor(options: Options) {
    this.store = options.store;
    this.fetcher = options.fetcher ?? fetch;
    this.schedule = options.schedule ?? scheduleIdle;
    this.createURL = options.createURL ?? URL.createObjectURL.bind(URL);
    this.revokeURL = options.revokeURL ?? URL.revokeObjectURL.bind(URL);
    this.sourceBudget = options.sourceBudget ?? memoryBudget;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.revision;
  getSource(source: string) {
    return this.sources.get(source)?.url;
  }
  isDownloaded(source: string) {
    return this.downloaded.has(source);
  }
  isDecoded(source: string) {
    const image = this.decoded.get(source);
    return (
      !!image?.complete &&
      image.naturalWidth > 0 &&
      image.currentSrc === this.getSource(source)
    );
  }
  markDecoded(source: string, image: HTMLImageElement) {
    this.decoded.delete(source);
    this.decoded.set(source, image);
    while (this.decoded.size > 2)
      this.decoded.delete(this.decoded.keys().next().value!);
  }

  private changed() {
    this.revision++;
    this.listeners.forEach((listener) => listener());
  }

  enqueue(sources: string[]) {
    this.queue = [...new Set([...this.queue, ...sources])].filter(
      (source) => !this.downloaded.has(source) && !this.downloads.has(source),
    );
    this.sortQueue();
    this.pump();
  }

  prioritize(sources: string[]) {
    this.preferred = new Set(sources);
    this.sortQueue();
  }

  private sortQueue() {
    this.queue.sort(
      (a, b) => Number(this.preferred.has(b)) - Number(this.preferred.has(a)),
    );
  }

  setBackgroundEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.cancelScheduled?.();
      this.cancelScheduled = null;
      for (const [source, download] of this.downloads) {
        if (download.background && !this.consumers.get(source))
          download.controller.abort();
      }
    }
    this.pump();
  }

  private pump() {
    if (
      !this.enabled ||
      this.cancelScheduled ||
      this.downloads.size ||
      !this.queue.length
    )
      return;
    this.cancelScheduled = this.schedule(() => {
      this.cancelScheduled = null;
      if (!this.enabled || this.downloads.size) return;
      const source = this.queue.shift();
      if (source) void this.start(source, true).promise.catch(() => undefined);
    });
  }

  private start(source: string, background: boolean): Download {
    const download: Download = {
      controller: new AbortController(),
      background,
      promise: Promise.resolve(),
    };
    this.downloads.set(source, download);
    download.promise = this.download(source, download).finally(() => {
      if (this.downloads.get(source) === download)
        this.downloads.delete(source);
      if (
        download.controller.signal.aborted &&
        download.background &&
        !this.downloaded.has(source)
      ) {
        this.queue = [...new Set([source, ...this.queue])];
      }
      this.pump();
    });
    return download;
  }

  private async download(source: string, download: Download) {
    const signal = download.controller.signal;
    if (await this.store.has(source)) {
      signal.throwIfAborted();
      this.downloaded.add(source);
      this.changed();
      return;
    }
    signal.throwIfAborted();
    const response = await this.fetcher(source, {
      signal,
      priority: download.background ? "low" : "high",
      cache: "default",
    });
    if (!response.ok)
      throw new Error(`Photograph request failed (${response.status})`);
    const blob = await response.blob();
    signal.throwIfAborted();
    const stored = await this.store.put(source, blob);
    signal.throwIfAborted();
    if (stored) this.downloaded.add(source);
    if (this.consumers.get(source)) this.saveSource(source, blob);
    this.changed();
  }

  private saveSource(source: string, blob: Blob) {
    if (!this.sources.has(source))
      this.sources.set(source, { url: this.createURL(blob), size: blob.size });
    this.trimSources();
  }

  private async readSource(source: string) {
    const existing = this.getSource(source);
    if (existing) return existing;
    let reading = this.sourceReads.get(source);
    if (!reading) {
      reading = (async () => {
        const blob = await this.store.read(source);
        if (!blob) throw new Error("Cached photograph is unavailable");
        if (!this.consumers.get(source))
          throw new DOMException("Viewer closed", "AbortError");
        this.saveSource(source, blob);
        this.changed();
        return this.getSource(source)!;
      })().finally(() => this.sourceReads.delete(source));
      this.sourceReads.set(source, reading);
    }
    return reading;
  }

  acquire(source: string) {
    this.consumers.set(source, (this.consumers.get(source) ?? 0) + 1);
    const existing = this.sources.get(source);
    if (existing) {
      this.sources.delete(source);
      this.sources.set(source, existing);
    }
    let download = this.downloads.get(source);
    if (!existing && (!download || download.controller.signal.aborted)) {
      // A requested image owns bandwidth ahead of speculative downloads.
      for (const [other, task] of this.downloads) {
        if (
          !this.downloaded.has(source) &&
          other !== source &&
          task.background &&
          !this.consumers.get(other)
        )
          task.controller.abort();
      }
      download = this.start(source, false);
    }
    let released = false;
    const promise = (download?.promise ?? Promise.resolve()).then(async () => {
      if (released) throw new DOMException("Viewer closed", "AbortError");
      try {
        return await this.readSource(source);
      } catch (error) {
        if (released) throw error;
        // Browser eviction or an unavailable cache must retain a network fallback.
        this.downloaded.delete(source);
        const retry = this.downloads.get(source);
        await (
          retry && !retry.controller.signal.aborted
            ? retry
            : this.start(source, false)
        ).promise;
        return this.readSource(source);
      }
    });
    return {
      promise,
      release: () => {
        if (released) return;
        released = true;
        const remaining = (this.consumers.get(source) ?? 1) - 1;
        if (remaining) this.consumers.set(source, remaining);
        else {
          this.consumers.delete(source);
          const task = this.downloads.get(source);
          if (task) {
            if (!this.enabled) task.controller.abort();
            else task.background = true;
          }
        }
        this.trimSources();
      },
    };
  }

  private trimSources() {
    let bytes = [...this.sources.values()].reduce(
      (sum, item) => sum + item.size,
      0,
    );
    let changed = false;
    for (const [source, item] of this.sources) {
      if (bytes <= this.sourceBudget && this.sources.size <= 6) break;
      if (this.consumers.get(source)) continue;
      this.revokeURL(item.url);
      this.sources.delete(source);
      this.decoded.delete(source);
      bytes -= item.size;
      changed = true;
    }
    if (changed) this.changed();
  }

  async invalidate(source: string) {
    const cached = this.sources.get(source);
    if (cached) this.revokeURL(cached.url);
    this.sources.delete(source);
    this.downloaded.delete(source);
    this.decoded.delete(source);
    await this.store.remove(source);
    this.changed();
  }
}

export const galleryOriginalStore = new BrowserOriginalStore();
export const galleryOriginalCache = new GalleryOriginalCache({
  store: galleryOriginalStore,
});
