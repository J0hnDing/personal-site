import { useEffect, useRef } from "react";
import "./cursor-mark.css";

type CursorMarkProps = {
  motionOff?: boolean;
};

const interactiveSelector =
  'a, button, input, textarea, select, summary, [role="button"], [data-cursor="interactive"]';

function findInteractiveTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(interactiveSelector) : null;
}

/**
 * A small, content-free pointer companion for precise pointer devices.
 *
 * The browser pointer stays visible and owns all input. This element only
 * follows it visually, so it cannot intercept links, buttons, or focus.
 */
export default function CursorMark({ motionOff = false }: CursorMarkProps) {
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (motionOff) return;

    const mark = markRef.current;
    if (!mark) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    // CSS also keeps the mark out of coarse-pointer layouts. Avoid attaching
    // document listeners there so touch and pen input stay completely idle.
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame: number | null = null;
    let paused = document.visibilityState === "hidden";
    let positioned = false;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let velocityX = 0;
    let velocityY = 0;

    const hide = () => {
      mark.classList.remove("is-visible", "is-interactive");
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      velocityX = 0;
      velocityY = 0;
      positioned = false;
    };

    const setInteractive = (target: EventTarget | null) => {
      mark.classList.toggle(
        "is-interactive",
        Boolean(findInteractiveTarget(target)),
      );
    };

    const settle = () => {
      frame = null;
      if (paused || !positioned) return;

      const deltaX = targetX - x;
      const deltaY = targetY - y;
      velocityX = (velocityX + deltaX * 0.18) * 0.7;
      velocityY = (velocityY + deltaY * 0.18) * 0.7;
      x += velocityX;
      y += velocityY;

      mark.style.setProperty("--cursor-x", `${x}px`);
      mark.style.setProperty("--cursor-y", `${y}px`);
      mark.style.setProperty(
        "--cursor-angle",
        `${Math.atan2(velocityY, velocityX) * (180 / Math.PI)}deg`,
      );

      if (
        Math.abs(deltaX) < 0.08 &&
        Math.abs(deltaY) < 0.08 &&
        Math.abs(velocityX) < 0.08 &&
        Math.abs(velocityY) < 0.08
      ) {
        x = targetX;
        y = targetY;
        mark.style.setProperty("--cursor-x", `${x}px`);
        mark.style.setProperty("--cursor-y", `${y}px`);
        return;
      }

      frame = requestAnimationFrame(settle);
    };

    const schedule = () => {
      if (frame === null && !paused) frame = requestAnimationFrame(settle);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (paused || event.pointerType === "touch") return;

      targetX = event.clientX;
      targetY = event.clientY;
      setInteractive(event.target);

      if (!positioned) {
        x = targetX;
        y = targetY;
        positioned = true;
        mark.style.setProperty("--cursor-x", `${x}px`);
        mark.style.setProperty("--cursor-y", `${y}px`);
      }

      mark.classList.add("is-visible");
      schedule();
    };

    const handlePointerOver = (event: PointerEvent) => {
      if (!paused) setInteractive(event.target);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        hide();
        return;
      }
      if (!paused) setInteractive(event.relatedTarget);
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
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerover", handlePointerOver);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [motionOff]);

  if (motionOff) return null;

  return (
    <div ref={markRef} className="cursor-mark" aria-hidden="true">
      <span className="cursor-mark__geometry">
        <span className="cursor-mark__ring" />
        <span className="cursor-mark__cross cursor-mark__cross--horizontal" />
        <span className="cursor-mark__cross cursor-mark__cross--vertical" />
        <span className="cursor-mark__corner cursor-mark__corner--north-west" />
        <span className="cursor-mark__corner cursor-mark__corner--north-east" />
        <span className="cursor-mark__corner cursor-mark__corner--south-west" />
        <span className="cursor-mark__corner cursor-mark__corner--south-east" />
      </span>
      <span className="cursor-mark__accent">+</span>
    </div>
  );
}
