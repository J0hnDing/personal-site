import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import Snap from "lenis/snap";
import "lenis/dist/lenis.css";
import { mountScrollController } from "./scrollController";

export default function SmoothScroll({ disabled }: { disabled: boolean }) {
  const { pathname } = useLocation();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (disabled) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      lerp: 0.085,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
    });

    lenisRef.current = lenis;
    const unmountScrollController = mountScrollController(lenis);

    return () => {
      unmountScrollController();
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [disabled]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis || pathname !== "/") return;

    const snap = new Snap(lenis, {
      type: "proximity",
      distanceThreshold: "18%",
      debounce: 240,
      lerp: 0.12,
    });
    const snapSections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-snap]"),
    );
    snap.addElements(snapSections, { align: "start" });

    return () => snap.destroy();
  }, [disabled, pathname]);

  return null;
}
