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
