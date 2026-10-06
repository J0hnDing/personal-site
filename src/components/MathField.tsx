import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";
import "./math-field.css";

type MathFieldProps = {
  variant?: "orbit" | "code";
  contours?: boolean;
  progress?: MotionValue<number>;
  figure?: number;
  motionOff?: boolean;
  className?: string;
};

const TAU = Math.PI * 2;
const FRAME_INTERVAL = 1000 / 40;
const GLYPHS = "01{}[]<>/\\λπΣ∫∞∂xyzfn";
const CODE_TOKENS = [
  "0110",
  "x→",
  "{f}",
  "λx",
  "∂t",
  "fn()",
  "[i]",
  "Σn",
  "0x1",
  "<T>",
  "y²",
  "∞",
] as const;
const PALETTE = ["#a8b5a4", "#aaa5c1", "#d8d6cd", "#8299a0"];
const FIGURE_COUNT = 4;

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const hash = (value: number) => {
  const x = Math.sin(value * 91.173 + 17.719) * 43758.5453;
  return x - Math.floor(x);
};

function drawCodeField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
  prominent: boolean,
  still: boolean,
) {
  const spacing = prominent ? Math.max(42, Math.min(68, width / 14)) : 70;
  const columns = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  const patch = still ? 0 : Math.floor(elapsed * (prominent ? 6.25 : 1.7));

  context.save();
  context.font = `${prominent ? 11 : 9}px "IBM Plex Mono", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const cohortCount = prominent ? 8 : 5;
      const cohort = Math.floor(hash(index + 4.2) * cohortCount);
      const localPatch = Math.max(0, patch - cohort);
      const generation = prominent
        ? Math.floor((patch + cohortCount - 1 - cohort) / cohortCount)
        : Math.floor(localPatch / 3);
      const tokenSet = prominent ? CODE_TOKENS : GLYPHS;
      const symbolIndex = Math.floor(
        hash(index * 2.31 + generation * 8.7) * tokenSet.length,
      );
      const baseX = column * spacing + (hash(index + 1.1) - 0.5) * 20;
      const baseY = row * spacing + (hash(index + 6.7) - 0.5) * 20;
      const dx = baseX / width - 0.5;
      const dy = baseY / height - 0.5;
      const distance = Math.hypot(dx - pointerX * 0.12, dy - pointerY * 0.12);
      const pulse = still
        ? 0.45
        : 0.25 + 0.75 * hash(index * 0.71 + generation);
      const alpha =
        (prominent ? 0.22 : 0.026) * pulse * clamp(1.15 - distance, 0.3, 1);

      context.fillStyle = `rgba(216, 214, 205, ${alpha})`;
      context.fillText(
        tokenSet[symbolIndex] ?? "0",
        baseX + pointerX * (5 + hash(index) * 7),
        baseY + pointerY * (5 + hash(index + 3) * 7),
      );
    }
  }
  context.restore();
}

type Point3 = { x: number; y: number; z: number };

function rotatePoint(
  point: Point3,
  xAngle: number,
  yAngle: number,
  zAngle: number,
) {
  const cosX = Math.cos(xAngle);
  const sinX = Math.sin(xAngle);
  const cosY = Math.cos(yAngle);
  const sinY = Math.sin(yAngle);
  const cosZ = Math.cos(zAngle);
  const sinZ = Math.sin(zAngle);

  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return {
    x: x2 * cosZ - y1 * sinZ,
    y: x2 * sinZ + y1 * cosZ,
    z: z2,
  };
}

function project(
  point: Point3,
  centerX: number,
  centerY: number,
  scale: number,
) {
  const perspective = 3.8 / (4.2 - point.z);
  return {
    x: centerX + point.x * scale * perspective,
    y: centerY + point.y * scale * perspective,
    depth: perspective,
  };
}

type FigureKind = 0 | 1 | 2 | 3;

function createLorenzPoints() {
  const points: Point3[] = [];
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const dt = 0.005;
  let x = 0.1;
  let y = 0;
  let z = 0;

  for (let step = 0; step < 6200; step += 1) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;

    if (step > 900) {
      points.push({
        x: x / 22,
        // Face the butterfly's x/z plane toward the viewer.
        y: (25 - z) / 29,
        z: y / 58,
      });
    }
  }

  return points;
}

const LORENZ_POINTS = createLorenzPoints();

function closedFigurePoint(
  figure: 0 | 1 | 2,
  amount: number,
  fiberPosition: number,
  elapsed: number,
  scroll: number,
  still: boolean,
): Point3 {
  const t = amount * TAU;
  const phase = fiberPosition * TAU;
  const spread = fiberPosition - 0.5;
  const drift = still ? 0 : elapsed;

  if (figure === 0) {
    const eta = Math.PI / 4;
    const xi1 = t + phase / 2 + drift * 0.035;
    const xi2 = t - phase / 2 + drift * 0.035;
    const x1 = Math.cos(eta) * Math.cos(xi1);
    const y1 = Math.cos(eta) * Math.sin(xi1);
    const x2 = Math.sin(eta) * Math.cos(xi2);
    const y2 = Math.sin(eta) * Math.sin(xi2);
    const denominator = 1 - y2;
    return {
      x: (x1 / denominator) * 0.55,
      y: (y1 / denominator) * 0.55,
      z: (x2 / denominator) * 0.55,
    };
  }

  if (figure === 2) {
    const u = t * 2 + drift * 0.035;
    const v = spread * 0.92;
    const ring = 1 + v * Math.cos(u / 2);
    return {
      x: ring * Math.cos(u),
      y: ring * Math.sin(u),
      z: v * Math.sin(u / 2),
    };
  }

  const breathing = still ? 0 : Math.sin(elapsed * 0.42 + phase * 1.7) * 0.035;
  const scrollFold = scroll * 0.15 * Math.sin(t * 5 + phase);
  const minor = 0.34 + breathing + scrollFold;
  const coil = 3 * t + phase + (still ? 0 : Math.sin(elapsed * 0.23) * 0.17);
  const radial = 1 + minor * Math.cos(coil);
  return {
    x: radial * Math.cos(2 * t),
    y: radial * Math.sin(2 * t),
    z: (minor + scroll * 0.055) * Math.sin(coil),
  };
}

function lorenzPoint(
  amount: number,
  fiberPosition: number,
  fiberCount: number,
): Point3 {
  const fiberIndex =
    fiberCount <= 1 ? 0 : Math.round(fiberPosition * (fiberCount - 1));
  const trajectoryAmount =
    fiberCount <= 1 ? amount : (fiberIndex + amount) / fiberCount;
  const sample = clamp(trajectoryAmount) * (LORENZ_POINTS.length - 1);
  const index = Math.floor(sample);
  const source = LORENZ_POINTS[index] ?? { x: 0, y: 0, z: 0 };
  const next = LORENZ_POINTS[index + 1] ?? source;
  const mix = sample - index;
  return {
    x: source.x + (next.x - source.x) * mix,
    y: source.y + (next.y - source.y) * mix,
    z: source.z + (next.z - source.z) * mix,
  };
}

function orientedFigurePoint(
  figure: FigureKind,
  amount: number,
  fiberPosition: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
  scroll: number,
  still: boolean,
  fiberCount = 1,
): Point3 {
  const source =
    figure <= 2
      ? closedFigurePoint(
          figure as 0 | 1 | 2,
          amount,
          fiberPosition,
          elapsed,
          scroll,
          still,
        )
      : lorenzPoint(amount, fiberPosition, fiberCount);

  const moving = still ? 0 : elapsed;
  const xAngles = [0.14, 0.92, 0.92, 0.2];
  const yAngles = [-0.16, -0.34, -0.34, -0.2];
  const zAngles = [0.08, -0.12, -0.12, -0.08];
  const rotationRates = [0.035, 0.09, 0.07, 0];
  const scaleFactors = [0.76, 0.92, 0.88, 1.05];
  const xAngle =
    (xAngles[figure] ?? 0) +
    pointerY * (figure === 3 ? 0.12 : 0.15) +
    (still ? 0 : Math.sin(elapsed * 0.19) * 0.06);
  const yAngle =
    (yAngles[figure] ?? 0) +
    pointerX * (figure === 3 ? 0.15 : 0.18) +
    moving * (rotationRates[figure] ?? 0) +
    (still || figure !== 3 ? 0 : Math.sin(elapsed * 0.16) * 0.12);
  const zAngle =
    (zAngles[figure] ?? 0) +
    scroll * (figure === 3 ? 0.3 : 0.4) +
    (still || figure >= 3 ? 0 : elapsed * 0.025);
  const rotated = rotatePoint(source, xAngle, yAngle, zAngle);
  const scale = scaleFactors[figure] ?? 1;

  return {
    x: rotated.x * scale,
    y: rotated.y * scale + (figure === 0 ? 0.12 : 0),
    z: rotated.z * scale,
  };
}

function drawOrbit(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
  scroll: number,
  figure: number,
  still: boolean,
) {
  const centerX = width * (width > height * 1.25 ? 0.54 : 0.5);
  const centerY = height * 0.56;
  const scale = Math.min(width, height) * 0.34;
  const fibers = width < 520 ? 22 : 34;
  const segments = width < 520 ? 250 : 220;
  const from = Math.floor(figure);
  const rawMix = figure - from;
  const mix = rawMix * rawMix * (3 - 2 * rawMix);
  const fromKind = (((from % FIGURE_COUNT) + FIGURE_COUNT) %
    FIGURE_COUNT) as FigureKind;
  const toKind = ((((from + 1) % FIGURE_COUNT) + FIGURE_COUNT) %
    FIGURE_COUNT) as FigureKind;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.globalCompositeOperation = "screen";

  for (let fiber = 0; fiber < fibers; fiber += 1) {
    const fiberPosition = fiber / (fibers - 1);
    const color = PALETTE[fiber % PALETTE.length] ?? "#a8b5a4";
    context.beginPath();

    for (let step = 0; step <= segments; step += 1) {
      const amount = step / segments;
      const first = orientedFigurePoint(
        fromKind,
        amount,
        fiberPosition,
        elapsed,
        pointerX,
        pointerY,
        scroll,
        still,
        fibers,
      );
      const second = orientedFigurePoint(
        toKind,
        amount,
        fiberPosition,
        elapsed,
        pointerX,
        pointerY,
        scroll,
        still,
        fibers,
      );
      const point = {
        x: first.x + (second.x - first.x) * mix,
        y: first.y + (second.y - first.y) * mix,
        z: first.z + (second.z - first.z) * mix,
      };
      const projected = project(point, centerX, centerY, scale);
      if (step === 0) context.moveTo(projected.x, projected.y);
      else context.lineTo(projected.x, projected.y);
    }

    context.strokeStyle =
      color + (still ? "a8" : fiber % 7 === 0 ? "88" : "55");
    context.lineWidth = fiber % 7 === 0 ? 1.35 : 0.72;
    context.stroke();
  }

  if (!still) {
    context.globalAlpha = 0.42;
    for (let index = 0; index < 72; index += 1) {
      const amount = hash(index * 1.19);
      const fiberPosition = hash(index * 3.47);
      const first = orientedFigurePoint(
        fromKind,
        amount,
        fiberPosition,
        elapsed,
        pointerX,
        pointerY,
        scroll,
        still,
        fibers,
      );
      const second = orientedFigurePoint(
        toKind,
        amount,
        fiberPosition,
        elapsed,
        pointerX,
        pointerY,
        scroll,
        still,
        fibers,
      );
      const point = {
        x: first.x + (second.x - first.x) * mix,
        y: first.y + (second.y - first.y) * mix,
        z: first.z + (second.z - first.z) * mix,
      };
      const projected = project(point, centerX, centerY, scale);
      context.beginPath();
      context.arc(
        projected.x,
        projected.y,
        0.45 + hash(index + 9.1) * 0.75,
        0,
        TAU,
      );
      context.fillStyle = PALETTE[index % PALETTE.length] ?? PALETTE[0];
      context.fill();
    }
  }

  context.restore();
}

function drawCodeContours(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  pointerX: number,
  pointerY: number,
  still: boolean,
) {
  const centerX = width * 0.5 + pointerX * 14;
  const centerY = height * 0.52 + pointerY * 10;
  const radius = Math.min(width, height) * 0.31;
  const loops = still ? 1 : 5;

  context.save();
  context.lineWidth = 0.7;
  for (let loop = 0; loop < loops; loop += 1) {
    context.beginPath();
    const phase = loop * 0.3 + (still ? 0 : elapsed * 0.06);
    for (let step = 0; step <= 180; step += 1) {
      const t = (step / 180) * TAU;
      const x =
        centerX + Math.sin(3 * t + phase) * radius * (0.72 + loop * 0.035);
      const y = centerY + Math.sin(2 * t) * radius * (0.48 + loop * 0.025);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = `${PALETTE[loop % PALETTE.length]}${still ? "3b" : "20"}`;
    context.stroke();
  }
  context.restore();
}

export default function MathField({
  variant = "orbit",
  contours = true,
  progress,
  figure = 0,
  motionOff = false,
  className = "",
}: MathFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayedFigure = useRef(figure);
  const targetFigure = useRef(figure);
  targetFigure.current = figure;
  const redrawStill = useRef<(() => void) | null>(null);
  const contoursEnabled = useRef(contours);
  contoursEnabled.current = contours;

  useEffect(() => {
    if (
      !motionOff &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    displayedFigure.current = figure;
    // Static mode has no animation loop, so request one redraw for a new figure.
    redrawStill.current?.();
  }, [figure, motionOff]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionOff || reducedQuery.matches;
    if (reduced) displayedFigure.current = targetFigure.current;
    let width = 0;
    let height = 0;
    let visible = true;
    let raf = 0;
    let lastFrame = 0;
    const startedAt = performance.now();
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width);
      const nextHeight = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      width = nextWidth;
      height = nextHeight;
      canvas.width = Math.round(nextWidth * dpr);
      canvas.height = Math.round(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const draw = (now: number, forceStill = false) => {
      if (width <= 0 || height <= 0) return;
      const still = reduced || forceStill;
      const elapsed = still ? 0 : (now - startedAt) / 1000;
      const scroll = clamp(progress?.get() ?? 0);
      context.clearRect(0, 0, width, height);
      drawCodeField(
        context,
        width,
        height,
        elapsed,
        pointerX,
        pointerY,
        variant === "code",
        still,
      );
      if (variant === "orbit") {
        drawOrbit(
          context,
          width,
          height,
          elapsed,
          pointerX,
          pointerY,
          scroll,
          displayedFigure.current,
          still,
        );
      } else if (contoursEnabled.current) {
        drawCodeContours(
          context,
          width,
          height,
          elapsed,
          pointerX,
          pointerY,
          still,
        );
      }
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced) return;
      if (now - lastFrame >= FRAME_INTERVAL) {
        const delta = lastFrame
          ? Math.min(now - lastFrame, 64)
          : FRAME_INTERVAL;
        const pointerMix = 1 - Math.exp(-delta / 370);
        pointerX += (pointerTargetX - pointerX) * pointerMix;
        pointerY += (pointerTargetY - pointerY) * pointerMix;
        displayedFigure.current +=
          (targetFigure.current - displayedFigure.current) *
          (1 - Math.exp(-delta / 280));
        if (Math.abs(targetFigure.current - displayedFigure.current) < 0.001) {
          displayedFigure.current = targetFigure.current;
        }
        draw(now);
        lastFrame = now;
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !visible || document.hidden || reduced) return;
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerTargetX =
        clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      pointerTargetY =
        clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onMotionPreference = () => {
      reduced = motionOff || reducedQuery.matches;
      if (reduced) {
        stop();
        displayedFigure.current = targetFigure.current;
        draw(performance.now(), true);
      } else {
        start();
      }
    };

    redrawStill.current = () => draw(performance.now(), true);

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start();
      else stop();
    });

    resizeObserver.observe(canvas);
    intersectionObserver.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reducedQuery.addEventListener("change", onMotionPreference);
    resize();
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedQuery.removeEventListener("change", onMotionPreference);
      redrawStill.current = null;
    };
  }, [motionOff, progress, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`math-field math-field--${variant}${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}
