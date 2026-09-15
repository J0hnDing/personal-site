# John Ding — A work in curiosity

A personal portfolio built with React, TypeScript, Vite, and Motion. Graphite, muted sage, and dusty violet surround an interactive mathematical wire form. The landing page pairs John Ding's full name with a tagline; About holds the personal introduction.

## Run locally

Requires Node.js 22.12+ (validated with Node 24).

```powershell
npm install
npm run dev
```

Open [the local preview](http://127.0.0.1:5173). `npm run build` type-checks and creates `dist/`; `npm run preview` serves that build on port 4173.

## Content

Edit `src/content.ts`. See [the content guide](docs/CONTENT.md) for name, tagline, biography, project material, photography, thoughts, and contact configuration. The introductory paragraph is explicitly marked as draft. No product screenshots, project facts, personal photographs, or contact details have been fabricated. The gallery starts empty, and one clearly identified thought demonstrates the reading layout.

## Structure

- `src/App.tsx`: routes, navigation, intro, motion, and page components.
- `src/components/Landing.tsx`: pinned scroll composition and destination index.
- `src/components/MathField.tsx`: procedural canvas geometry and code textures.
- `src/components/CursorMark.tsx`: nonblocking cursor companion.
- `src/components/ScrambleText.tsx`: hover decoding with stable text geometry.
- `src/content.ts`: typed editable content.
- `src/styles.css`: design tokens, layouts, interaction states, and responsive rules.
- `public/`: favicon and future local images.
- `docs/DESIGN.md`: reference study and visual decisions.

Routes include `/`, `/about`, `/projects`, `/projects/:slug`, `/gallery`, `/thoughts`, `/thoughts/:slug`, `/contact`, and a missing-page view. New project and thought records create their corresponding routes automatically.

## Interaction and accessibility

The multilingual intro uses staggered code textures, runs once per browser tab session, and can be skipped. Scrolling unfolds the landing composition; moving the pointer and the Transform control reshape its mathematical form. Page shutters, project reveals, decoding text, and a fine-pointer cursor mark add motion without capturing clicks or the wheel. The native cursor stays visible.

Reduced-motion users bypass the intro, pinned sequence, cursor mark, and continuous drawing. A footer motion control, visible keyboard focus, a skip link, keyboard-contained mobile navigation, and native photo dialogs support alternate ways of using the site. Canvas rendering is capped at 40 FPS and 1.75 device-pixel ratio, and pauses when offscreen or hidden. Fonts are bundled locally; there are no remote image or font requests.

## Hosting

This repository is ready for static hosting. Configure the host to serve `index.html` for application routes so direct links and refreshes work. It has not been deployed. `public/_redirects` supplies the SPA fallback for hosts that support that convention. A real production origin is needed before adding canonical URLs or a sitemap.
