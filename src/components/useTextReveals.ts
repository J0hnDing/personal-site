import { useEffect, type RefObject } from "react";

/** Fallback for mixed/interactive markup; plain text uses LineRevealText. */
export function useTextReveals(
  root: RefObject<HTMLElement | null>,
  motionOff: boolean,
) {
  useEffect(() => {
    const container = root.current;
    if (!container || motionOff) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("text-revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -25px 0px" },
    );
    const register = () => {
      container
        .querySelectorAll<HTMLElement>(
          "h1, h2, h3, p, blockquote, figcaption, .text-link, .back-link, .contact-row, .sample-label, .project-row-meta, .project-row-bottom",
        )
        .forEach((element) => {
          // The hero and semantic line-reveal elements own their entrances.
          if (
            element.closest(".math-landing") ||
            element.closest(".project-section") ||
            element.closest("[data-line-reveal]") ||
            element.querySelector("[data-line-reveal]") ||
            element.classList.contains("text-reveal")
          )
            return;
          element.classList.add("text-reveal");
          observer.observe(element);
        });
    };
    register();
    const mutations = new MutationObserver(register);
    mutations.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      container.querySelectorAll(".text-reveal").forEach((element) => {
        element.classList.remove("text-reveal", "text-revealed");
      });
    };
  }, [root, motionOff]);
}
