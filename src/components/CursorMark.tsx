import { useEffect, useRef } from "react";
import "./cursor-mark.css";

type CursorMarkProps = { motionOff?: boolean };
const interactiveSelector =
  'a, button, input, textarea, select, summary, [role="button"], [data-cursor="interactive"]';
const restingSize = 36;
const hoverPaddingX = 10;
const hoverPaddingY = 8;
const followDelayMs = 60;

function findInteractiveTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(interactiveSelector) : null;
}

/** Four corner brackets that follow the pointer and fit hovered elements. */
export default function CursorMark({ motionOff = false }: CursorMarkProps) {
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (motionOff) return;
    const mark = markRef.current;
    if (!mark) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame: number | null = null;
    let paused = document.visibilityState === "hidden";
    let positioned = false;
    let pointerX = 0;
    let pointerY = 0;
    let x = 0;
    let y = 0;
    let width = restingSize;
    let height = restingSize;
    let hovered: Element | null = null;
    let lastFrameTime = 0;

    const hide = () => {
      mark.classList.remove("is-visible");
      document.documentElement.classList.remove("has-custom-cursor");
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastFrameTime = 0;
      positioned = false;
      hovered = null;
      width = restingSize;
      height = restingSize;
      mark.style.width = `${restingSize}px`;
      mark.style.height = `${restingSize}px`;
    };

    const settle = (time: number) => {
      frame = null;
      if (paused || !positioned) return;
      const elapsed = lastFrameTime ? Math.min(time - lastFrameTime, 32) : 16.7;
      lastFrameTime = time;

      // Keep fitting the target when scroll or transitions move it.
      if (hovered && !hovered.isConnected) hovered = null;
      const rect = hovered?.getBoundingClientRect();
      const fits = rect && rect.width > 0 && rect.height > 0;
      const targetX = fits ? rect.left + rect.width / 2 : pointerX;
      const targetY = fits ? rect.top + rect.height / 2 : pointerY;
      const targetWidth = fits
        ? Math.max(restingSize, rect.width + hoverPaddingX * 2)
        : restingSize;
      const targetHeight = fits
        ? Math.max(restingSize, rect.height + hoverPaddingY * 2)
        : restingSize;

      // A time-based follow rate leaves a visible gap on quick sweeps, then
      // lets the brackets catch up smoothly when the pointer slows or stops.
      const follow = 1 - Math.exp(-elapsed / followDelayMs);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      width += (targetWidth - width) * 0.2;
      height += (targetHeight - height) * 0.2;
      mark.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      mark.style.width = `${width}px`;
      mark.style.height = `${height}px`;

      if (
        hovered ||
        Math.abs(targetX - x) > 0.1 ||
        Math.abs(targetY - y) > 0.1 ||
        Math.abs(targetWidth - width) > 0.1 ||
        Math.abs(targetHeight - height) > 0.1
      ) {
        frame = requestAnimationFrame(settle);
      } else {
        lastFrameTime = 0;
      }
    };

    const schedule = () => {
      if (frame === null && !paused) frame = requestAnimationFrame(settle);
    };
    const setHovered = (target: EventTarget | null) => {
      hovered = findInteractiveTarget(target);
      schedule();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (paused || event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      setHovered(event.target);
      if (!positioned) {
        x = pointerX;
        y = pointerY;
        positioned = true;
        mark.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      }
      mark.classList.add("is-visible");
      document.documentElement.classList.add("has-custom-cursor");
      schedule();
    };
    const handlePointerOver = (event: PointerEvent) => {
      if (!paused && event.pointerType === "mouse") setHovered(event.target);
    };
    const handlePointerOut = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (event.relatedTarget === null) hide();
      else if (!paused) setHovered(event.relatedTarget);
    };
    const handleScroll = () => {
      if (positioned && !paused) {
        setHovered(document.elementFromPoint(pointerX, pointerY));
      }
    };
    const handleBlur = () => {
      paused = true;
      hide();
    };
    const handleFocus = () => {
      paused = document.visibilityState === "hidden";
    };
    const handleVisibilityChange = () => {
      paused = document.visibilityState === "hidden";
      if (paused) hide();
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      hide();
    };
  }, [motionOff]);

  if (motionOff) return null;
  return (
    <div ref={markRef} className="cursor-mark" aria-hidden="true">
      <span className="cursor-mark__corner cursor-mark__corner--top-left" />
      <span className="cursor-mark__corner cursor-mark__corner--top-right" />
      <span className="cursor-mark__corner cursor-mark__corner--bottom-left" />
      <span className="cursor-mark__corner cursor-mark__corner--bottom-right" />
    </div>
  );
}
