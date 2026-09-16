import type Lenis from "lenis";

let activeLenis: Lenis | null = null;

export function mountScrollController(lenis: Lenis) {
  activeLenis = lenis;
  return () => {
    if (activeLenis === lenis) activeLenis = null;
  };
}

export function scrollPageTo(target: number | HTMLElement, immediate = false) {
  if (activeLenis) {
    activeLenis.scrollTo(target, { immediate, force: true });
    return;
  }

  if (typeof target === "number") {
    window.scrollTo({
      top: target,
      behavior: immediate ? "instant" : "smooth",
    });
  } else {
    target.scrollIntoView({
      behavior: immediate ? "instant" : "smooth",
      block: "start",
    });
  }
}
