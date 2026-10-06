import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { profile } from "../content";
import LineRevealText from "./LineRevealText";
import ScrollCue from "./ScrollCue";
import ScrambleText from "./ScrambleText";

type Reveal = { startedAt: number; durationMs: number };

function PixelPortrait({
  motionOff,
  reveal,
}: {
  motionOff: boolean;
  reveal: Reveal | null;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || motionOff) return;
    // Keep the resampled surfaces CPU-backed. Copying a freshly resized GPU
    // canvas into another canvas caused synchronous stalls on the first reveal.
    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
    const sample = document.createElement("canvas");
    const sampleContext = sample.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });
    if (!context || !sampleContext) {
      setResolved(true);
      return;
    }
    let frame = 0;
    let active = true;
    let finished = false;
    let width = 0;
    let height = 0;

    const draw = () => {
      if (!active || !image.complete || !image.naturalWidth) return;
      const progress = reveal
        ? Math.min(
            1,
            (performance.now() - reveal.startedAt) / reveal.durationMs,
          )
        : 0;
      if (!width || !height) return;
      if (progress >= 1) {
        // Keep the same surface for the final frame: no canvas/image paint gap.
        context.imageSmoothingEnabled = true;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        if (!finished) {
          finished = true;
          setResolved(true);
        }
        return;
      }
      // Refine continuously from 24px cells to full resolution in 800ms.
      const initialColumns = Math.max(1, Math.round(width / 24));
      sample.width = Math.max(
        1,
        Math.round(
          initialColumns * (canvas.width / initialColumns) ** progress,
        ),
      );
      sample.height = Math.max(
        1,
        Math.round(((sample.width * height) / width) * 1.4),
      );
      sampleContext.drawImage(image, 0, 0, sample.width, sample.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(sample, 0, 0, canvas.width, canvas.height);
      if (reveal && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      draw();
    };
    const resize = () => {
      ({ width, height } = canvas.getBoundingClientRect());
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      resume();
    };
    image.addEventListener("load", resume);
    document.addEventListener("visibilitychange", resume);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      image.removeEventListener("load", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [motionOff, reveal]);

  return (
    <figure
      className={`intro-portrait${motionOff || resolved ? " is-resolved" : ""}`}
    >
      <img
        ref={imageRef}
        src="/john-portrait.webp"
        alt="John standing beside a turquoise mountain lake with his camera."
        width="1200"
        height="1600"
        decoding="async"
      />
      {!motionOff && <canvas ref={canvasRef} aria-hidden="true" />}
    </figure>
  );
}

export default function QuickIntroduction({
  motionOff,
}: {
  motionOff: boolean;
}) {
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const startReveal = useCallback(() => {
    setReveal(
      (previous) =>
        previous ?? { startedAt: performance.now(), durationMs: 800 },
    );
  }, []);

  return (
    <section
      className="quick-intro"
      id="about"
      data-scroll-section
      aria-label="Introduction"
    >
      <div className="quick-intro-text">
        <LineRevealText
          text={profile.intro}
          motionOff={motionOff}
          className="quick-intro-copy"
          onReveal={startReveal}
        />
        <Link className="text-link" to="/about">
          <ScrambleText text="More about me" motionOff={motionOff} />{" "}
          <span aria-hidden="true" className="arrow">
            ↗
          </span>
        </Link>
      </div>
      <PixelPortrait motionOff={motionOff} reveal={reveal} />
      <ScrollCue motionOff={motionOff} />
    </section>
  );
}
