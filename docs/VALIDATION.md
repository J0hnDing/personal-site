# Validation — September 15, 2026

## Build and source checks

- TypeScript: `node --max-old-space-size=1024 .\node_modules\typescript\bin\tsc -b` passed.
- Production build: Vite built 453 modules successfully with the explicit 1 GB build heap.
- Prettier and `git diff --check` passed for this revision.

## Browser checks

- Inspected the requested Dennis Snellenberg and Khanh Nguyen references in the browser.
- Verified the greeting screen uses the shared code background and the hero follows with the figure/name entrance.
- Visually inspected desktop and mobile hero/role states. Confirmed intermediate role opacities occur in order, with unrevealed lines translated below their masks; completed lines reach opacity 1.
- Confirmed one main landmark and one primary heading, and the Home section order: home, about, projects, gallery, thoughts, contact.
- Checked 1280px desktop, 768px tablet, 390px mobile, and 320px mobile layouts without horizontal document overflow. All five navigation links fit on one line at 320px.
- Verified More about me opens About, Home returns to the hero, Projects and Contact anchors work, and browser Back returns from a project detail to the project index position.
- Tested direct `/gallery`, `/thoughts`, and `/contact` redirects plus `/about`, `/projects/eidolon`, and `/thoughts/on-noticing` at 768px. Each had one main, one h1, and no document overflow.
- Verified the manual Motion off control exposes all four role lines and page text immediately, with no residual hidden reveal elements.

## Scope

Browser checks used the Codex in-app Chromium browser. Physical-device Safari/Firefox and a production hosting environment were not tested. Photography and project media remain empty, contact values remain unset, and the existing thought remains labeled as a sample.

## Follow-up visual correction

- Rechecked the stacked Major Mono Display identity and aligned role block at full-screen desktop, 390×844, 320×700, and 1024×640. Name, role lines, icons, figure, and metadata remain readable without horizontal document overflow.
- Visually confirmed the central background contours are absent after the intro.
- Switched through all five figures and verified each number, title, and mathematical study description.
- Adjusted mobile separation between roles and geometry, and short-landscape clearance above the figure metadata.

## Quick-introduction line reveal — September 21, 2026

- Verified the introduction resolves into six independently masked lines at the canonical 1920×953 full-screen viewport and eight lines at 390×844.
- Inspected the opening, intermediate, and settled animation states; the first line waits 180 ms, then each following line rises after a 140 ms stagger while its 6 px blur resolves to zero.
- Confirmed the 390 px layout follows the browser's actual character-level wrapping, including the break inside “fourth-year,” with no nested line wrapping or horizontal document overflow.
- Confirmed Motion off restores one immediately visible semantic paragraph with no split-line animation.
- Production build, Prettier, `git diff --check`, and the browser console passed without errors.

## Shared text reveal — September 22, 2026

- Promoted the quick introduction's measured line masks into `LineRevealText` for plain headings, paragraphs, captions, quotes, list items, and labels across Home, About, project detail, Gallery, Thoughts, article detail, Contact, and the 404 page. The landing name and scroll-driven roles remain unchanged.
- Kept the mask and blur on mixed interactive text through the existing observer, preserving scramble-on-hover links and project-row interactions.
- Inspected the canonical 1920×953 full-screen composition and 390×844 mobile article, project-detail, and quick-introduction layouts. Corrected padded badge, notice, and blockquote insets so their animated text remains aligned with the original content box; the wrapped Eidolon Atlas title reveals as two lines without shifting its arrow.
- Checked About, project detail, article detail, Gallery, and Contact at 390×844: one main heading on each route and no horizontal document overflow. The browser console reported no application errors; Motion emitted its reduced-motion advisory during the toggle check.
- Motion off displays unsplit text immediately, with no residual line masks. TypeScript/Vite build, Prettier, and diff checks passed.

## Home scroll boundaries — September 22, 2026

- In the full-screen 1920×897 browser, scrolled Gallery → Projects → About → the last Home viewport. Each settled stop aligned the chapter edge within one device pixel, with no intentional glimpse of the next chapter.
- During the Projects entrance, a downward wheel event stayed at the Projects boundary, while an upward event returned to About and settled at its top. The browser reported no application warnings or errors.
- The TypeScript/Vite production build and focused diff check passed.

## Moving chapter mask — September 22, 2026

- Verified at the canonical full-screen desktop viewport that Projects advances as a hard moving boundary over the pinned Introduction, with both chapters visible at the intermediate transition frame.
- Reversed direction from the intermediate frame and confirmed the same boundary immediately uncovers the Introduction rather than moving both chapters together.
- Confirmed the forward stop settles Projects flush to the viewport and the backward stop restores Introduction flush to the viewport, preserving the gesture gate in both directions.
- The browser console had no warnings or errors. The TypeScript/Vite production build, focused Prettier check, and `git diff --check` passed.

## Landing-to-Introduction cover correction — September 22, 2026

- In the canonical full-screen viewport, confirmed the landing stage remains at the top while the Introduction's edge moves upward over it. At the intermediate frame, both chapters are visible; the landing no longer scrolls upward with the Introduction.
- Verified the Introduction settles within one pixel of the viewport top and reversing the gesture uncovers the landing, stopping with the Introduction below the viewport.
- Confirmed Home and Projects navigation reaches their actual document-flow starts despite the sticky chapters.
- The browser console reported no warnings or errors; production build, Prettier, and `git diff --check` passed.
