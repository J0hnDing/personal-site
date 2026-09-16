# John Ding

A personal portfolio built with React, TypeScript, Vite, and Motion. Graphite, muted sage, and dusty violet surround an interactive mathematical wire form. Home is one continuous page: identity and roles, a short introduction, Projects, Gallery, Thoughts, and Contact.

## Run locally

Requires Node.js 22.12+ (validated with Node 24).

```powershell
npm install
npm run dev
```

Open [the local preview](http://127.0.0.1:5173). `npm run build` type-checks and creates `dist/`; `npm run preview` serves that build on port 4173.

## Content

Edit `src/content.ts`. See [the content guide](docs/CONTENT.md) for name, biography, project material, photography, thoughts, and contact configuration. The introduction uses John’s supplied fourth-year CS and Mathematics background at the University of Toronto. No product screenshots, project facts, personal photographs, or contact details have been fabricated. The gallery starts empty, and one clearly identified thought demonstrates the reading layout.

## Structure

- `src/App.tsx`: routes, navigation, intro, motion, and page components.
- `src/components/Landing.tsx`: name entrance, sequential scroll-revealed roles, and mathematical figure control.
- `src/components/MathField.tsx`: procedural canvas geometry and code textures.
- `src/components/CursorMark.tsx`: nonblocking cursor companion.
- `src/components/useTextReveals.ts`: shared bottom-up text entrances, including newly added text.
- `src/content.ts`: typed editable content.
- `src/styles.css`: design tokens, layouts, interaction states, and responsive rules.
- `public/`: favicon and future local images.
- `docs/DESIGN.md`: reference study and visual decisions.

Routes include `/`, `/about`, `/projects/:slug`, `/thoughts/:slug`, and a missing-page view. The former `/projects`, `/gallery`, `/thoughts`, and `/contact` index URLs redirect to their Home sections. New project and thought records create their corresponding routes automatically.

## Interaction and accessibility

The multilingual intro uses staggered code textures, runs once per browser tab session, and can be skipped. The greetings fade out over a persistent code background. The figure fades in and the stacked sans-serif name rises into view; scrolling reveals four roles in sequence. New page text uses the same bottom-up entrance. Moving the pointer and using Next figure reshape the mathematical form. A fine-pointer cursor mark adds motion without capturing clicks or the wheel. The native cursor stays visible.

Reduced-motion users bypass the intro, pinned sequence, cursor mark, and continuous drawing. A footer motion control, visible keyboard focus, a skip link, five text navigation links at every viewport, and native photo dialogs support alternate ways of using the site. Canvas rendering is capped at 40 FPS and 1.75 device-pixel ratio, and pauses when offscreen or hidden. Fonts are bundled locally; there are no remote image or font requests.

## Hosting

This repository is ready for static hosting. Configure the host to serve `index.html` for application routes so direct links and refreshes work. It has not been deployed. `public/_redirects` supplies the SPA fallback for hosts that support that convention. A real production origin is needed before adding canonical URLs or a sitemap.
