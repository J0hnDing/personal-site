import "./style.css";
import manifest from "../../public/gallery-assets/manifest.json";
import { createLayout, GalleryWorld, type GalleryCell, type GalleryPhoto } from "./galleryGeometry";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Sample root is missing");

const photos: GalleryPhoto[] = manifest.photos;
const initialLastParentDepth = 1;
const maxCells = 2500;

app.innerHTML = `
  <div class="sample-shell">
    <header class="topbar">
      <div class="title-block">
        <span class="eyebrow">Geometry sample / experimental generator</span>
        <h1>Rectangle attachment tree</h1>
        <p>Each number is a rectangle's depth in the tree. Select one to trace its parent and children.</p>
      </div>
      <div class="controls" aria-label="Generation controls">
        <button id="next-parent" type="button">Next parent</button>
        <button id="next-generation" type="button">Next generation</button>
        <button id="new-layout" type="button">New layout</button>
        <button id="fit-view" type="button">Fit view</button>
      </div>
    </header>
    <main class="stage" id="stage" aria-label="Rectangle tree canvas">
      <div class="world" id="world"></div>
      <div class="canvas-hint">Drag to pan · Scroll to zoom · Click a rectangle to inspect</div>
      <aside class="inspector" aria-live="polite">
        <div class="inspector-heading"><span class="eyebrow">Tree inspector</span><span id="seed"></span></div>
        <div class="metrics" id="metrics"></div>
        <div class="selected" id="selected"></div>
        <div class="legend">
          <span><i class="swatch swatch-1"></i>1 · Root</span>
          <span><i class="swatch swatch-2"></i>2 · Children</span>
          <span><i class="swatch swatch-3"></i>3 · Grandchildren</span>
          <span><i class="swatch swatch-photo"></i>Photo slot</span>
        </div>
        <details class="debug-trace" id="debug-trace">
          <summary>Generation trace <span id="debug-count">0 events</span></summary>
          <div class="debug-actions"><button id="download-trace" type="button">Download JSON trace</button></div>
          <pre id="debug-output">Open this panel to inspect the trace. Download JSON for the complete event log.</pre>
        </details>
      </aside>
    </main>
  </div>
`;

const stage = document.querySelector<HTMLElement>("#stage")!;
const worldLayer = document.querySelector<HTMLElement>("#world")!;
const metrics = document.querySelector<HTMLElement>("#metrics")!;
const selectedInfo = document.querySelector<HTMLElement>("#selected")!;
const seedLabel = document.querySelector<HTMLElement>("#seed")!;
const nextParentButton = document.querySelector<HTMLButtonElement>("#next-parent")!;
const nextGenerationButton = document.querySelector<HTMLButtonElement>("#next-generation")!;
const debugDetails = document.querySelector<HTMLDetailsElement>("#debug-trace")!;
const debugCount = document.querySelector<HTMLElement>("#debug-count")!;
const debugOutput = document.querySelector<HTMLPreElement>("#debug-output")!;
const downloadTraceButton = document.querySelector<HTMLButtonElement>("#download-trace")!;

let seed = 0;
let world: GalleryWorld;
let selectedId: number | null = null;
let zoom = 1;
let panX = 0;
let panY = 0;
let drag: { pointerId: number; x: number; y: number; moved: boolean } | null = null;

function limitReached() { return world.cells.length >= maxCells; }

function processNext() {
  if (!world.pending || limitReached()) return false;
  return world.processNext();
}

function processDepth(depth: number) {
  while (world.pending && !limitReached() && (world.cells[world.processed]?.depth ?? Infinity) <= depth) {
    if (!world.processNext()) return false;
  }
  return true;
}

function makeWorld() {
  // Some random arrangements can enclose a gap narrower than every valid
  // rectangle. Start the demonstration with complete first-generation parents.
  for (let attempt = 0; attempt < 32; attempt++) {
    seed = Math.floor(Math.random() * 0xffffffff);
    world = new GalleryWorld(photos, createLayout(window.innerWidth, window.innerHeight), seed);
    if (processDepth(0) && processDepth(initialLastParentDepth)) break;
  }
  selectedId = null;
  fitView();
  render();
}

function fitView() {
  const extent = world.extent;
  const padding = 80;
  const availableWidth = Math.max(100, stage.clientWidth - padding * 2);
  const availableHeight = Math.max(100, stage.clientHeight - padding * 2);
  zoom = Math.min(1.45, availableWidth / extent.width, availableHeight / extent.height);
  panX = stage.clientWidth / 2 - (extent.x + extent.width / 2) * zoom;
  panY = stage.clientHeight / 2 - (extent.y + extent.height / 2) * zoom;
  updateTransform();
}

function updateTransform() {
  worldLayer.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
}

function debugTraceBundle() {
  return {
    seed,
    minimumDimension: world.layout.minimum,
    minimumScale: world.layout.minScale,
    maximumScale: world.layout.maxScale,
    maximumDimension: world.layout.maxDimension,
    aspectRatios: world.layout.ratios,
    generatedCellCount: world.cells.length,
    processedParentCount: world.processed,
    stalledParentId: world.stalledParentId,
    error: world.lastError,
    cells: world.cells.map(({ photo, ...cell }) => ({
      ...cell,
      photo: photo ? { id: photo.id, width: photo.width, height: photo.height } : null,
    })),
    events: world.debugEvents,
  };
}

function renderDebugTrace() {
  debugCount.textContent = `${world.debugEvents.length} events`;
  if (debugDetails.open) debugOutput.textContent = JSON.stringify(debugTraceBundle(), null, 2);
}

function downloadDebugTrace() {
  const blob = new Blob([JSON.stringify(debugTraceBundle(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gallery-trace-${seed}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

debugDetails.addEventListener("toggle", renderDebugTrace);
downloadTraceButton.addEventListener("click", downloadDebugTrace);

function cellRole(cell: GalleryCell) {
  if (cell.id === selectedId) return "is-selected";
  if (selectedId !== null && cell.id === world.cells[selectedId].parentId) return "is-parent";
  if (selectedId !== null && cell.parentId === selectedId) return "is-child";
  return "";
}

function render() {
  if (selectedId !== null && !world.cells[selectedId]) selectedId = null;
  const fragment = document.createDocumentFragment();
  for (const cell of world.cells) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = `tree-rect depth-${Math.min(cell.depth + 1, 6)} ${cell.photo ? "has-photo" : ""} ${cellRole(cell)}`;
    element.dataset.id = String(cell.id);
    element.style.left = `${cell.x}px`;
    element.style.top = `${cell.y}px`;
    element.style.width = `${cell.width}px`;
    element.style.height = `${cell.height}px`;
    element.setAttribute("aria-label", `Rectangle ${cell.id}, depth ${cell.depth + 1}, parent ${cell.parentId === null ? "none" : cell.parentId}`);
    const label = document.createElement("span");
    label.className = "depth-label";
    label.textContent = String(cell.depth + 1);
    const caption = document.createElement("span");
    caption.className = "cell-caption";
    caption.textContent = cell.photo ? `#${cell.id} · PHOTO ${cell.photo.id}` : `#${cell.id} · ${cell.parentId === null ? "ROOT" : `PARENT #${cell.parentId}`}`;
    element.append(label, caption);
    fragment.append(element);
  }
  worldLayer.replaceChildren(fragment);
  updateTransform();

  const deepest = Math.max(...world.cells.map((cell) => cell.depth + 1));
  const photoCount = world.cells.filter((cell) => cell.photo).length;
  const next = world.cells[world.processed];
  const inspected = selectedId === null ? world.cells[0] : world.cells[selectedId];
  const coverage = world.sideCoverage(inspected);
  metrics.innerHTML = `
    <div><strong>${world.cells.length}</strong><span>Rectangles</span></div>
    <div><strong>${world.processed}</strong><span>Parents filled</span></div>
    <div><strong>${deepest}</strong><span>Deepest label</span></div>
    <div><strong>${photoCount}</strong><span>Photo slots</span></div>
  `;
  seedLabel.textContent = `Seed ${seed}`;
  if (selectedId === null) {
    selectedInfo.innerHTML = `
      <strong>Root #0 · ${world.isFilled(world.cells[0]) ? "all 4 sides covered" : "exposed side remains"}</strong>
      <span>${next ? `Next in BFS: #${next.id}, depth ${next.depth + 1}.` : "Every queued rectangle has been processed."}</span>
    `;
  } else {
    const selected = world.cells[selectedId];
    const children = world.cells.filter((cell) => cell.parentId === selectedId);
    selectedInfo.innerHTML = `
      <strong>Rectangle #${selected.id} · depth ${selected.depth + 1}</strong>
      <span>Parent: ${selected.parentId === null ? "none (root)" : `#${selected.parentId}`} · Children: ${children.length}</span>
      <span>Size: ${Math.round(selected.width)} × ${Math.round(selected.height)} · ${selected.photo ? `Photo slot: ${selected.photo.id}` : "No photo"}</span>
      <span>${world.isFilled(selected) ? "All 4 sides covered" : "Exposed side remains"}</span>
    `;
  }
  if (world.stalledParentId !== null) {
    const stalled = document.createElement("span");
    stalled.className = "stalled";
    stalled.textContent = world.lastError
      ? `BFS stopped at #${world.stalledParentId}: ${world.lastError}`
      : `BFS stopped at #${world.stalledParentId}: no valid rectangle closes its remaining gaps.`;
    selectedInfo.prepend(stalled);
  }
  const coverageList = document.createElement("div");
  coverageList.className = "side-coverage";
  for (const { side, length, covered } of coverage) {
    const row = document.createElement("div");
    row.className = "coverage-row";
    row.innerHTML = `<span>${side}</span><span>${covered.toFixed(1)} / ${length.toFixed(1)}</span>`;
    const track = document.createElement("div");
    track.className = "coverage-track";
    const fill = document.createElement("div");
    fill.className = "coverage-fill";
    fill.style.width = `${Math.max(0, Math.min(100, covered / length * 100))}%`;
    track.append(fill);
    row.append(track);
    coverageList.append(row);
  }
  selectedInfo.append(coverageList);
  nextParentButton.disabled = !world.pending || limitReached() || world.stalledParentId !== null;
  nextGenerationButton.disabled = !world.pending || limitReached() || world.stalledParentId !== null;
  renderDebugTrace();
}

nextParentButton.addEventListener("click", () => {
  if (world.stalledParentId !== null) return;
  processNext();
  fitView();
  render();
});

nextGenerationButton.addEventListener("click", () => {
  const depth = world.cells[world.processed]?.depth;
  if (depth === undefined) return;
  processDepth(depth);
  fitView();
  render();
});

document.querySelector("#new-layout")!.addEventListener("click", makeWorld);
document.querySelector("#fit-view")!.addEventListener("click", fitView);

stage.addEventListener("pointerdown", (event) => {
  if (event.target instanceof Element && event.target.closest(".inspector")) return;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener("pointermove", (event) => {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  panX += dx;
  panY += dy;
  drag.x = event.clientX;
  drag.y = event.clientY;
  updateTransform();
});
stage.addEventListener("pointerup", (event) => {
  if (!drag || drag.pointerId !== event.pointerId) return;
  if (!drag.moved) {
    const rect = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".tree-rect");
    selectedId = rect ? Number(rect.dataset.id) : null;
    render();
  }
  drag = null;
});
stage.addEventListener("pointercancel", () => { drag = null; });
stage.addEventListener("wheel", (event) => {
  if (event.target instanceof Element && event.target.closest(".inspector")) return;
  event.preventDefault();
  const oldZoom = zoom;
  zoom = Math.max(0.08, Math.min(3, zoom * Math.exp(-event.deltaY * 0.001)));
  const x = event.clientX - stage.getBoundingClientRect().left;
  const y = event.clientY - stage.getBoundingClientRect().top;
  panX = x - (x - panX) * zoom / oldZoom;
  panY = y - (y - panY) * zoom / oldZoom;
  updateTransform();
}, { passive: false });

window.addEventListener("resize", fitView);
makeWorld();
