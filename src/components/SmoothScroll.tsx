import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { homeSectionTop, mountScrollController } from "./scrollController";

export default function SmoothScroll({ disabled }: { disabled: boolean }) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (disabled) return;

    const sections =
      pathname === "/"
        ? Array.from(
            document.querySelectorAll<HTMLElement>("[data-scroll-section]"),
          )
        : [];
    const gesturePause = 200;
    const boundaryHold = 500;
    let lastInput = 0;
    let blockedBoundary: {
      sectionIndex: number;
      position: number;
      direction: number;
      releaseAt: number;
    } | null = null;
    let resizeFrame = 0;
    let lenis: Lenis;

    const boundaryPosition = (sectionIndex: number) => {
      const section = sections[sectionIndex];
      const documentTop = homeSectionTop(section)!;
      // The tall landing ends on its last full viewport. Every later chapter
      // starts at the top of the viewport in both scroll directions.
      return sectionIndex === 0
        ? documentTop + section.offsetHeight - window.innerHeight
        : documentTop;
    };

    const block = (event: WheelEvent | TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      return false;
    };

    lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      lerp: 0.07,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: pathname === "/",
      virtualScroll: (data) => {
        const { event, deltaY } = data;
        if (!sections.length || lenis.isStopped || event.ctrlKey) return true;
        if (
          event.target instanceof Element &&
          event.target.closest(".mobile-menu, dialog, [data-lenis-prevent]")
        )
          return true;

        const now = performance.now();

        // A touch can release a settled gate only when a genuinely new gesture starts.
        if (event.type === "touchstart") {
          if (blockedBoundary && now >= blockedBoundary.releaseAt) {
            blockedBoundary = null;
          }
          lastInput = now;
          return true;
        }
        if (!deltaY) return true;

        const startsNewWheelGesture =
          event.type === "wheel" && now - lastInput > gesturePause;
        lastInput = now;
        if (blockedBoundary !== null) {
          if (Math.sign(deltaY) !== blockedBoundary.direction) {
            // Reversing direction always releases the gate immediately.
            blockedBoundary = null;
          } else if (!startsNewWheelGesture) {
            // Inertia can outlast the initial hold, so start the dwell after
            // the final event in this burst rather than after the first hit.
            blockedBoundary.releaseAt = now + boundaryHold;
            return block(event);
          } else if (now < blockedBoundary.releaseAt) {
            return block(event);
          } else {
            blockedBoundary = null;
          }
        }

        const current = lenis.targetScroll;
        const destination = current + deltaY;
        const direction = Math.sign(deltaY);
        const boundaries = sections.map((_section, index) => ({
          position: boundaryPosition(index),
          index,
        }));
        const candidates = boundaries.filter(({ position }) =>
          deltaY > 0
            ? position > current + 0.5 && position <= destination
            : position < current - 0.5 && position >= destination,
        );
        const boundary = candidates.reduce<
          { position: number; index: number } | undefined
        >(
          (nearest, candidate) =>
            !nearest ||
            (deltaY > 0
              ? candidate.position < nearest.position
              : candidate.position > nearest.position)
              ? candidate
              : nearest,
          undefined,
        );
        if (!boundary) return true;

        blockedBoundary = {
          sectionIndex: boundary.index,
          direction,
          position: boundary.position,
          releaseAt: now + boundaryHold,
        };
        data.deltaY = boundary.position - current;
        return Math.abs(data.deltaY) < 0.5 ? block(event) : true;
      },
    });

    const realignBlockedBoundary = () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        if (!blockedBoundary) return;
        const position = boundaryPosition(blockedBoundary.sectionIndex);
        blockedBoundary.position = position;
        lenis.scrollTo(position, { immediate: true, force: true });
      });
    };
    window.addEventListener("resize", realignBlockedBoundary);
    window.visualViewport?.addEventListener("resize", realignBlockedBoundary);
    const sectionResizeObserver = new ResizeObserver(realignBlockedBoundary);
    sections.forEach((section) => sectionResizeObserver.observe(section));

    const unmountScrollController = mountScrollController(lenis);

    return () => {
      window.removeEventListener("resize", realignBlockedBoundary);
      window.visualViewport?.removeEventListener(
        "resize",
        realignBlockedBoundary,
      );
      sectionResizeObserver.disconnect();
      window.cancelAnimationFrame(resizeFrame);
      unmountScrollController();
      lenis.destroy();
    };
  }, [disabled, pathname]);

  return null;
}
