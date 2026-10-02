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

## Introduction portrait — October 1, 2026

- Inspected the canonical 1920×1080 desktop composition, including coarse, intermediate, and resolved reveal frames. Also checked 1440×900, 1366×768, 768×1024, 390×844, and 320×640 layouts.
- Desktop keeps the full portrait beside the text; phones place it above the text. No horizontal overflow was found. A narrow-phone size adjustment keeps the 320×640 chapter at exactly one viewport, with the link inside its bounds.
- Recorded canvas sample dimensions increasing from 18×34 to 534×997 on the 1920px desktop before the original image appears. Photo completion and the final text-line transition ended within 9ms of each other across the tested sizes.
- System reduced motion and the manual Motion off toggle show the photograph and unsplit paragraph immediately, without a canvas. The manual toggle preserved scroll position.
- TypeScript, Vite production build, focused formatting, and diff checks passed. Browser checks reported no application errors. A desktop preview is saved locally at `.playwright-mcp/thoughts-desktop.png`. Screenshots are saved locally under `.playwright-mcp/intro-*.png`.

Follow-up: replaced the introduction with the supplied ML/AI-agents and personal-interests copy, correcting “can optimized” to “can optimize.” Reduced responsive typography and changed the portrait to three subtle refinement steps over 650ms. Rechecked 1920×1080, 1366×768, 390×844, and 320×640; the portrait finishes about 1.1–1.5 seconds before the final text line, with no horizontal overflow. A tighter narrow-phone link margin keeps the 320×640 chapter within one screen. TypeScript, production build, and focused formatting/diff checks passed.

Follow-up: restored continuous per-frame refinement while retaining the 650ms duration and subtle 14px initial cells. Full-screen desktop tracing recorded 60 distinct resolutions over 663ms, with no application errors. TypeScript and focused formatting/diff checks passed.

October 2 follow-up: addressed the reported end-of-reveal flash by retaining the canvas and drawing the fully resolved photograph on it. Canvas buffers now resize only when their dimensions change. Desktop (1920×1080) and phone (390×844) checks confirmed the same canvas survived the handoff with zero removals and zero transparent center-pixel samples across 45 and 111 sampled frames respectively. Verified resolved-image redraw after resizing and manual Motion off/on behavior. TypeScript, production build, and focused formatting/diff checks passed.

## Gallery and Thoughts title acceleration — October 2, 2026

- Both titles grow by eight percent during the initial 950ms, then enlarge sharply over 1.4 seconds. A single transform animation spans both stages without a transition restart; the fast stage eases acceleration at the join. Responsive opening and final sizes are measured once before animating.
- Sampled actual rendered bounding rectangles and transforms across the intro-to-canvas handoff. Gallery width grew through 276.64, 281.08, and 286.32px before the handoff, then 413.69 and 593.91px afterward; Thoughts likewise continued from 412.62 and 420.91px to 535.29 and 747.79px. Both kept the same animation name across the phase change and reached their original final watermark dimensions.
- Verified Motion off removes the animation and shows the settled title, and restoring Motion on does not replay the intro. The fade and system reduced-motion bypass remain unchanged.
- TypeScript, Vite production build, focused formatting, and diff checks passed.

## Thoughts spatial index — October 1, 2026

- Production TypeScript/Vite build, focused Prettier checks, and diff checks passed.
- Six geometry tests cover measured packing, bouncing, fixed bodies with stored resume velocity, wrapping seams, arbitrary camera movement with unique IDs, and a two-minute desktop/mobile simulation with intermittent freezing and no overlap.
- Inspected the canonical 1920×1080 composition and 390×844 phone layout. Measured the canvas at exactly one viewport and confirmed no horizontal page overflow, including 320×640 bounds. Long questions wrap on phones. The field reserves a clear navigation band, and the initial camera starts near a random question so the first view contains readable text.
- Verified dragging moves text opposite the pointer, does not accidentally open a detail page, and preserves one rendered instance of each of the twelve questions. Keyboard focus centers an offscreen question, freezes its measured position, and completes the underline. Enter opens the matching detail page; the return link reaches the Home Thoughts chapter. A mouse-hover check independently confirmed identical question coordinates across samples and a settled full-width underline, and a mouse click opened the matching detail.
- Verified Motion off preserves a stationary canvas with all twelve links. System reduced motion follows the same state path; it was checked in source rather than separately emulated. Browser checks reported no application errors. A desktop preview is saved locally at `.playwright-mcp/thoughts-desktop.png`.
- The title uses Gallery's opening hold and enlargement/fade timings. A rendered-position visibility check supplements IntersectionObserver for sticky Home chapters.

Follow-up — October 2: removed the desktop and phone navigation exclusion strips so the thought field fills the entire viewport. Navigation remains outside the physics simulation. Formatting and diff checks passed; live browser QA was not repeated.

## Thoughts dust and camera motion — October 2, 2026

- Reused the hero/Projects eighteen-point `landing-point-float` background. At the canonical 1920×1080 viewport, all eighteen points were running that same animation, and the settled watermark measured `rgba(211, 211, 211, 0.04)`.
- A rightward 150px drag produced rightward text movement followed by additional movement after release. Fine mouse pointers near the right edge also produced rightward panning. Hover/focus cancels camera motion to keep questions clickable; new gestures, cancellations, hidden/covered views, and window blur clear motion.
- Four camera tests cover decaying momentum, travel consistency across frame rates, directional edge speed with a central dead zone, and interruption. All ten camera/geometry tests passed, along with TypeScript, production build, focused formatting, and diff checks.
- Manual Motion off removes dust animation and disables autonomous camera movement while retaining direct dragging. No browser application warnings or errors were reported. Saved the desktop preview locally at `.playwright-mcp/thoughts-motion-desktop.png`.

Follow-up — October 2: hover/focus now anchors only the selected question on screen while momentum and other questions continue. A canonical 1920×1080 browser check measured zero movement for the hovered question while the other questions moved another 51–54px after release. Edge zones now cover the outer quarter of each viewport axis and continuously pan as if dragging away from the nearest edge, with constant speed at a fixed pointer position and linear speed up to 120px/s at the boundary. Browser sampling at x=1600 confirmed leftward movement in the wider right-edge zone. All twelve camera/geometry tests, TypeScript/Vite build, focused formatting, and diff checks passed; the browser reported no warnings or errors. Saved the preview locally at `.playwright-mcp/thoughts-hover-momentum.png`.

Follow-up — October 2: pressing and dragging a question now moves that question rather than the camera. A six-pixel movement threshold separates dragging from detail navigation, and captured pointers retain the selected question outside its bounds. Swept collision steps prevent fast pointer movements from skipping other questions. Two new geometry tests cover pushing a chain of neighbours, bouncing, drift resumption, and collisions across a wrapping seam; all fourteen camera/geometry tests passed. At 1920×1080, a question followed a 150×80px drag exactly while other questions retained their drift. With Motion off, dragging it into another question displaced two neighbours with zero overlapping rectangles; empty-space dragging still moved the field by 100px. Drag release stayed on the index and a subsequent normal click opened the matching detail page. Production build, focused formatting, and diff checks passed. No browser application errors were reported; toggling motion produced the library's existing reduced-motion notice. Saved the preview locally at `.playwright-mcp/thoughts-question-drag.png`.

Follow-up — October 2: collisions now use impulses with mass proportional to measured text area and 0.94 restitution. Held questions impart their pointer velocity, and a moving release launches the question without immediately freezing it under the pointer. Light air resistance removes excess speed at 0.12/s while retaining ambient drift. Adaptive movement substeps preserve collisions at high speeds. All nineteen camera/geometry tests passed, including momentum conservation, energy loss, drag-speed transfer, continued coasting, frame-rate independence, fast-impact tunnelling prevention, and repeated throws through twelve-question desktop/phone clouds. At 1920×1080, browser sampling confirmed released text kept moving and struck text coasted another 132px after contact, with subsequent momentum transfers and no overlapping rectangles. The route remained on the index. Production build, focused formatting, and diff checks passed; the browser reported no application errors. Saved the preview locally at `.playwright-mcp/thoughts-physical-collisions.png`.

Follow-up — October 2: softened drag impacts and releases to twenty percent of the measured pointer velocity, limiting launch speed to 240px/s. Direct pointer tracking, mass-based collision response, and light friction retain their existing behavior. Updated the impact/coasting expectations; all nineteen tests, production build, focused formatting, and diff checks passed. Live browser QA was not repeated for this parameter adjustment.

Follow-up — October 2: capped total question velocity at 180px/s after releases and collision impulses and before each simulation step. The magnitude cap preserves direction and applies to diagonal motion and collision amplification. Increased air resistance from 0.12/s to 0.32/s, retaining ambient drift. All twenty-one camera/geometry tests passed, including new diagonal-launch and impact-cap regressions, frame-rate-independent coasting, and continuous speed checks during repeated desktop/phone throws. Production build, focused formatting, and diff checks passed. Live browser QA was not repeated for this physics tuning.

Follow-up — October 2: mass now comes from each question's character count rather than its rendered rectangle. Free collisions conserve text-length-weighted momentum below the speed ceiling, while held questions transfer finite-mass impacts so longer text pushes harder at the same pointer speed. Kept the 180px/s total speed cap, softened releases, and existing air resistance. All twenty-three camera/geometry tests passed, including equal-size questions with different lengths, equal-length questions with different rendered sizes, weighted held impacts, and repeated desktop/phone throws with speed and overlap checks. TypeScript, production build, focused formatting, and diff checks passed. Live browser QA was not repeated for this physics change.

## October 2, 2026 — Separate archive routes

Added shared styled Projects, Gallery, Thoughts, and About routes while preserving Home’s six chapters and existing project/thought details. Header navigation leads to these routes; View All Work opens Projects. About copy uses the existing introduction/portrait plus Atlas-confirmed hobbies. Gallery supports real nested source folders, duplicate filenames, natural-aspect photography, and a keyboard-accessible enlargement dialog.

Validation: final TypeScript/Vite production build and scoped Prettier/diff checks passed. Four focused manifest tests cover recursive folders, root ID/URL compatibility, duplicate filenames, independent caching, removed sources, malformed/legacy/empty manifests, and missing source directories. Browser checks covered default desktop, 1440×900, 390×844, and 320×740 layouts; all new routes fit horizontally. Verified 48 photos, folder title, image enlargement, Next, Escape and focus return, Motion off, project/thought detail navigation and return, Home’s unchanged chapter IDs, and pointer activation of View All Work from settled Projects. No current browser console errors were observed.

Limitations: physical-device Safari/Firefox and deployed hosting were not checked. Existing project facts, authored thought bodies, and contact destinations remain awaiting supplied content. Existing loose photos form one All photographs collection; named collections use actual photos/ subfolders.

## October 2, 2026 — Contact moved into About

Removed Home’s Contact chapter and its obsolete styles. About now renders the four existing contact channels in a semantic definition list matching its dark, ruled biography sections. Both `/contact` and `/#contact` redirect to `/about#contact`, where focus reaches the Contact region.

Validation: TypeScript/Vite production build, scoped Prettier, and diff checks passed. Browser review covered the default desktop viewport and 390px/320px phone widths; contact rows stack on narrow phones with no horizontal document overflow. Confirmed both redirects, the five remaining Home chapter IDs, and manual Motion off with all four channels accessible. No browser errors were observed. Contact values remain explicit placeholders until supplied. Preview saved locally at `.playwright-mcp/about-contact.jpg`.

## October 2, 2026 — Gap-free Home Gallery tiling

Replaced the live Home Gallery's attachment generator with seeded, lazily generated rectangular chunks. Seven focused geometry tests pass: exhaustive strip coverage without holes or overlaps across seven seeds at desktop/mobile sizes, the full render buffer, strict minimum sides, distant views at positive/negative one-billion coordinates without generating intervening space, stable revisits and exploration-order independence, varied dimensions, bounded continuous collinear edge runs across large areas, degenerate random-source fallbacks, real-photo selection, and invalid input handling.

TypeScript/Vite production build and scoped diff checks passed. Geometry/test formatting passed. Browser review covered the default 1280×720 viewport and 390×844 phone size, confirmed settled tiling and contained photographs, checked rendered desktop coverage within browser subpixel rounding, and exercised keyboard panning. Phone geometry retained minimum dimensions and no horizontal document overflow. The browser reported no application errors. The standalone gallery-tree sample was not changed. Visited chunks remain cached, so memory grows with exploration; coordinates use JavaScript numeric precision. The existing large-bundle build warning remains.

Follow-up — October 2: increased lattice spacing to accommodate larger centered photo frames. Photographs keep their native aspect ratio with a target square-equivalent size of 246px desktop / 197px mobile and ±6% variation. Seeded spatial pools assign each image at most once per chunk and separate repeats by roughly 3,000 desktop world pixels; a visibility guard prevents repeated sources from being rendered together even in wide views or with small collections. All eleven geometry/photo tests passed, including consistent displayed areas, full collection usage, repeat separation, desktop/mobile views at minimum zoom, alias-source deduplication, stable cached geometry, and prioritizing on-screen photos over buffered copies. TypeScript/Vite build and geometry/test formatting passed. Browser checks at 1280×720 and 390×844 confirmed unique rendered sources, loaded images, enlarged natural-aspect dimensions, no phone horizontal overflow, and uniqueness after keyboard panning. No browser errors were reported. The existing bundle-size advisory remains.

## Project detail pages — October 2, 2026

- TypeScript/Vite production build and focused formatting/diff checks passed. Vite retains its advisory about a bundle above 500 kB.
- Checked all four project routes at 1440, 768, 390, and 320 pixels wide: one main heading per page, no horizontal document overflow, all local images loaded, and selectable diagram stages updating their explanations. Cubic intentionally has no speculative technical flow.
- Checked archive-to-detail and All projects navigation for every project, plus the four-project Next loop returning to Eidolon. Screenshot dialogs opened, closed through Escape and the close button, and returned focus to their trigger. Scrolling inside Atlas's modal did not move the underlying page.
- Inspected desktop case-study compositions for all four projects and settled mobile title, diagram explanation, and Projector conceptual artwork. Reduced motion and normal-motion text entrances both displayed the content. Browser checks found no application errors; Motion's expected reduced-motion warning appeared only while emulation was enabled.
- Seven genuine screenshot assets are locally served as WebP. Eidolon/Atlas captures use isolated demonstration state. Cubic assets are published README screenshots; its APK could not be run locally. Projector's native capture attempts timed out, so its artwork is explicitly conceptual. No deployment or physical-device Safari/Firefox checks were performed.
