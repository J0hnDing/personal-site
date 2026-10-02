# John Ding

A personal portfolio built with React, TypeScript, Vite, and Motion. Graphite, muted sage, and dusty violet surround an interactive mathematical wire form. Home is one continuous page: identity and roles, a short introduction, Projects, Gallery, Thoughts, and Contact.

## Run locally

Requires Node.js 22.12+ (validated with Node 24).
Gallery source photos use Git LFS. Install Git LFS and run `git lfs pull` after cloning so the image build has the original files.

```powershell
npm install
npm run dev
```

Open [the local preview](http://127.0.0.1:5173). `npm run build` type-checks and creates `dist/`; `npm run preview` serves that build on port 4173.

## Content

Edit `src/content.ts` for the profile, projects, thoughts, and contact details, and `src/pages/AboutPage.tsx` for the longer biography. See [the content guide](docs/CONTENT.md) for the image workflow. Project facts and contact details remain blank until confirmed. Gallery photographs come from `photos/` and its subfolders; local build and dev scripts create optimized derivatives without modifying the originals. Thoughts lists John’s supplied questions; article bodies await his writing.

## Structure

- `src/App.tsx`: routes, navigation, intro, motion, and page components.
- `src/pages/`: shared archive layout, biography, folder browsing, visual project case studies, and scoped styles.
- `src/components/Landing.tsx`: name entrance, sequential scroll-revealed roles, and mathematical figure control.
- `src/components/MathField.tsx`: procedural canvas geometry and code textures.
- `src/components/InfiniteGallery.tsx`: the randomized, virtualized photo canvas and pan/zoom interaction.
- `src/components/CursorMark.tsx`: nonblocking cursor companion.
- `scripts/prepare-gallery-assets.mjs`: cached WebP derivatives and folder metadata for `photos/` sources.
- `src/components/useTextReveals.ts`: shared bottom-up text entrances, including newly added text.
- `src/content.ts`: typed editable content.
- `src/styles.css`: design tokens, layouts, interaction states, and responsive rules.
- `public/`: favicon and future local images.
- `docs/DESIGN.md`: reference study and visual decisions.
- `docs/PROJECT_SOURCES.md`: project facts, screenshot provenance, and capture limitations.

Home remains one continuous page, ending with Thoughts. The five header links lead to Home, `/projects`, `/gallery`, `/thoughts`, and `/about`. Projects and Thoughts are simple lists linking to their existing `/projects/:slug` and `/thoughts/:slug` details. Gallery lists folders, with photographs at `/gallery/:folder`; its infinite spatial canvas stays in the Home section. Contact information lives in About’s ruled Contact section. Both `/contact` and `/#contact` redirect to `/about#contact`. New project and thought records create their corresponding routes automatically.

## Interaction and accessibility

The multilingual intro uses staggered code textures, runs once per browser tab session, and can be skipped. The greetings fade out over a persistent code background. The figure fades in while the two aligned name lines rise into view; a small animated chevron indicates the short pinned scroll, then fades as the four roles reveal while the name remains fixed. New page text uses the same bottom-up entrance. Moving the pointer and using Next figure reshape the mathematical form. A fine-pointer cursor mark adds motion without capturing clicks or the wheel. The native cursor stays visible.

Reduced-motion users bypass the intro, pinned sequence, cursor mark, and decorative gallery entrances. The Gallery can be panned with a drag or the arrow keys. Wheel zoom is off by default and can be enabled from its side toggle. A footer motion control, visible keyboard focus, a skip link, and five text navigation links support alternate ways of using the site. Fonts and photo derivatives are served locally; there are no remote image or font requests.

## Hosting

This repository is ready for static hosting. Configure the host to serve `index.html` for application routes so direct links and refreshes work. It has not been deployed. `public/_redirects` supplies the SPA fallback for hosts that support that convention. A real production origin is needed before adding canonical URLs or a sitemap.
