# Validation — September 12, 2026

## Final mathematical redesign

- The final TypeScript and Vite production builds passed. The combined `npm run build` process hit the host's roughly 128 MB Node heap ceiling after earlier successful runs, so the same two build stages were rerun separately with a 1 GB build-only heap allowance; both passed.
- Prettier passed for all application, component, configuration, and current design/content documentation files.
- `git diff --check` passed.
- A direct request to `http://127.0.0.1:5173/` returned HTTP 200 before browser validation.
- Chromium covered 12 routes at widths of 320, 390, 768, and 1440 pixels (48 combinations): home, About, project index, four project details, gallery, thought index, sample thought, contact, and missing page. Every case had one `main` landmark, one primary heading, no document-level horizontal overflow, and no page or console errors.
- Visually inspected the full-motion landing at desktop and mobile widths, the pinned midpoint composition, About, the animated code intro, and the final subdued palette.
- Verified the multilingual intro changes greetings, animates its computational canvas, completes automatically, and remains dismissed for the browser-tab session.
- Verified the main procedural canvas changes over time. The automated browser throttles background animation frames heavily, so frame comparisons used a 1.6-second interval.
- Verified pointer movement shows the cursor companion, and hovering the Transform control expands its interactive state. Activating Transform changes its pressed state.
- Verified the pinned landing remains fixed while the name fades fully out and “Between logic & possibility.” fades fully in at the tested 960-pixel scroll position.
- Verified manual motion-off removes the cursor companion and freezes the canvas; restoring motion remounts the cursor and restarts canvas animation.
- Verified system reduced motion uses the static experience in the responsive route matrix.
- Verified keyboard focus on the fourth project changes the visual index to `04`, and activating it navigates to the Projector detail page.
- Verified mobile navigation exposes Home, About, Projects, Gallery, Thoughts, and Contact. Escape closes it after its exit animation and restores focus to the menu control.
- Verified 200% text enlargement at 390 and 1440 pixels without document or header overflow; the landing tagline remains above the bottom control line.

The production JavaScript is approximately 139 KB gzip. Canvas rendering is capped at 40 FPS and a 1.75 device-pixel ratio, and pauses when offscreen or hidden. Fonts are bundled locally. No project screenshot, photograph, contact detail, or factual project description has been fabricated.

Physical-device Safari and Firefox, real supplied media, and production-host behavior remain unverified. The repository supplies a static-host SPA redirect, but it has not been deployed.
