import type Lenis from "lenis";

let activeLenis: Lenis | null = null;

export function homeSectionTop(target: HTMLElement): number | null {
  const home = target.parentElement;
  if (
    !home?.classList.contains("home-page") ||
    !target.matches("[data-scroll-section]")
  ) {
    return null;
  }

  let top = home.getBoundingClientRect().top + window.scrollY;
  for (const chapter of home.children) {
    if (chapter === target) return top;
    top += chapter.getBoundingClientRect().height;
  }

  return null;
}

export function mountScrollController(lenis: Lenis) {
  activeLenis = lenis;
  return () => {
    if (activeLenis === lenis) activeLenis = null;
  };
}

export function scrollPageTo(target: number | HTMLElement, immediate = false) {
  const chapterTop = typeof target === "number" ? null : homeSectionTop(target);
  const destination = chapterTop ?? target;

  if (activeLenis) {
    activeLenis.scrollTo(destination, { immediate, force: true });
    return;
  }

  if (typeof destination === "number") {
    window.scrollTo({
      top: destination,
      behavior: immediate ? "instant" : "smooth",
    });
  } else {
    destination.scrollIntoView({
      behavior: immediate ? "instant" : "smooth",
      block: "start",
    });
  }
}
