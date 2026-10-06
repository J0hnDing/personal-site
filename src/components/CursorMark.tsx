import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./cursor-mark.css";

type CursorMarkProps = { motionOff?: boolean };
const interactiveSelector =
  'a, button, input, textarea, select, summary, [role="button"], [data-cursor="interactive"]';
const restingSize = 36;
const dragSize = 44;
const draggingSize = 32;
const dragCanvasSelector = ".infinite-gallery, .infinite-thoughts";
const hoverPaddingX = 10;
const hoverPaddingY = 8;
const followDelayMs = 60;

function findInteractiveTarget(target: EventTarget | null): Element | null {
  return target instanceof Element ? target.closest(interactiveSelector) : null;
}

/** Brackets fit controls; directional chevrons mark draggable canvases. */
export default function CursorMark({ motionOff = false }: CursorMarkProps) {
  const markRef = useRef<HTMLDivElement>(null);
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [modal, setModal] = useState<HTMLDialogElement | null>(null);

  useLayoutEffect(() => {
    // Native dialogs occupy the top layer, above any ordinary z-index.
    const followModal = () => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>("dialog[open]");
      setModal(dialogs.item(dialogs.length - 1));
    };
    followModal();
    const observer = new MutationObserver(followModal);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, []);

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
    let canvas: Element | null = null;
    let pressedCanvas: Element | null = null;
    let pressedPointer: number | null = null;
    let gripping = false;
    let rotation = 0;
    let lastFrameTime = 0;

    const updateInteraction = () => {
      const canDrag =
        canvas?.getAttribute("data-phase") === "canvas" ||
        pressedCanvas?.getAttribute("data-phase") === "canvas";
      const nextGripping =
        canDrag && !!pressedCanvas?.isConnected && pressedPointer !== null;
      if (!canDrag) {
        rotation = 0;
        mark.style.setProperty("--cursor-turn", "0deg");
        gripping = false;
      } else if (nextGripping !== gripping) {
        // Each half of the press advances clockwise. The shape repeats at 90°.
        rotation += 45;
        mark.style.setProperty("--cursor-turn", `${rotation}deg`);
        gripping = nextGripping;
      }
      mark.classList.toggle("is-drag", canDrag);
      mark.classList.toggle("is-dragging", gripping);
      return canDrag;
    };

    const hide = () => {
      mark.classList.remove("is-visible");
      document.documentElement.classList.remove("has-custom-cursor");
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastFrameTime = 0;
      positioned = false;
      hovered = null;
      canvas = null;
      pressedCanvas = null;
      pressedPointer = null;
      updateInteraction();
      mark.classList.remove("is-over-thought");
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
      if (canvas && !canvas.isConnected) canvas = null;
      const canDrag = updateInteraction();
      // Hit-test independently of pointer capture and moving thought links.
      mark.classList.toggle(
        "is-over-thought",
        !!document
          .elementFromPoint(pointerX, pointerY)
          ?.closest(".floating-thought"),
      );
      const pointerSize = canDrag
        ? gripping
          ? draggingSize
          : dragSize
        : restingSize;
      const rect = hovered?.getBoundingClientRect();
      const fits = rect && rect.width > 0 && rect.height > 0;
      const targetX = fits ? rect.left + rect.width / 2 : pointerX;
      const targetY = fits ? rect.top + rect.height / 2 : pointerY;
      const targetWidth = fits
        ? Math.max(restingSize, rect.width + hoverPaddingX * 2)
        : pointerSize;
      const targetHeight = fits
        ? Math.max(restingSize, rect.height + hoverPaddingY * 2)
        : pointerSize;

      // A time-based follow rate leaves a visible gap on quick sweeps, then
      // lets the brackets catch up smoothly when the pointer slows or stops.
      const follow = 1 - Math.exp(-elapsed / followDelayMs);
      x += (targetX - x) * follow;
      y += (targetY - y) * follow;
      width += (targetWidth - width) * 0.2;
      height += (targetHeight - height) * 0.2;
      mark.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      mark.style.width = `${width}px`;
      mark.style.height = `${height}px`;

      if (
        hovered ||
        canvas ||
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
      // Questions can be dragged as well as opened; controls keep their fit.
      canvas =
        target instanceof Element &&
        (!hovered || hovered.matches(".floating-thought"))
          ? target.closest(dragCanvasSelector)
          : null;
      if (canvas) hovered = null;
      schedule();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (paused || event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerPositionRef.current = { x: pointerX, y: pointerY };
      setHovered(event.target);
      if (!positioned) {
        x = pointerX;
        y = pointerY;
        positioned = true;
        mark.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
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
      if (event.relatedTarget === null) {
        pointerPositionRef.current = null;
        hide();
      } else if (!paused) setHovered(event.relatedTarget);
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        paused ||
        event.pointerType !== "mouse" ||
        !event.isPrimary ||
        event.button !== 0
      )
        return;
      handlePointerMove(event);
      if (canvas?.getAttribute("data-phase") === "canvas") {
        pressedCanvas = canvas;
        pressedPointer = event.pointerId;
        updateInteraction();
      }
    };
    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerId === pressedPointer) {
        pressedCanvas = null;
        pressedPointer = null;
        updateInteraction();
      }
      if (!paused && event.pointerType === "mouse" && positioned) {
        setHovered(document.elementFromPoint(event.clientX, event.clientY));
      }
    };
    const handleScroll = () => {
      if (positioned && !paused) {
        setHovered(document.elementFromPoint(pointerX, pointerY));
      }
    };
    const handleBlur = () => {
      paused = true;
      pointerPositionRef.current = null;
      hide();
    };
    const handleFocus = () => {
      paused = document.visibilityState === "hidden";
    };
    const handleVisibilityChange = () => {
      paused = document.visibilityState === "hidden";
      if (paused) {
        pointerPositionRef.current = null;
        hide();
      }
    };

    const previousPointer = pointerPositionRef.current;
    if (previousPointer && !paused) {
      pointerX = x = previousPointer.x;
      pointerY = y = previousPointer.y;
      positioned = true;
      mark.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      mark.classList.add("is-visible");
      document.documentElement.classList.add("has-custom-cursor");
      setHovered(document.elementFromPoint(pointerX, pointerY));
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerover", handlePointerOver, {
      passive: true,
    });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointerup", handlePointerEnd, {
      passive: true,
      capture: true,
    });
    window.addEventListener("pointercancel", handlePointerEnd, {
      passive: true,
      capture: true,
    });
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
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      hide();
    };
  }, [motionOff, modal]);

  if (motionOff) return null;
  const mark = (
    <div ref={markRef} className="cursor-mark" aria-hidden="true">
      <div className="cursor-mark__shape">
        <span className="cursor-mark__corner cursor-mark__corner--top-left" />
        <span className="cursor-mark__corner cursor-mark__corner--top-right" />
        <span className="cursor-mark__corner cursor-mark__corner--bottom-left" />
        <span className="cursor-mark__corner cursor-mark__corner--bottom-right" />
        <svg className="cursor-mark__drag" viewBox="0 0 44 44" fill="none">
          <path d="m18 14 4-4 4 4 M18 30l4 4 4-4 M14 18l-4 4 4 4 M30 18l4 4-4 4" />
        </svg>
      </div>
    </div>
  );
  return modal ? createPortal(mark, modal) : mark;
}
