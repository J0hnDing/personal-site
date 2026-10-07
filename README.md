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

## Cloudflare deployment and gallery originals

Gallery previews and the application use Workers Static Assets. Full-resolution
originals use the private R2 Standard bucket `john-ding-gallery-originals`, served
by `workers/gallery-worker.mjs` at the same `/gallery-assets/__originals__/` URLs
used locally. No public bucket domain
or browser credentials are needed. JPEG, PNG, and WebP source bytes stay unchanged;
TIFF sources retain the existing lossless PNG conversion for browser display.

Enable R2 in the [Cloudflare dashboard](https://dash.cloudflare.com/) once, then:

```powershell
npx wrangler login
npx wrangler r2 bucket create john-ding-gallery-originals
npm run deploy
```

For Cloudflare Builds, keep the build command `npm run build` and set the deploy
command to **`npm run deploy:built`**, replacing `npx wrangler deploy`. Set the
non-production version command to **`npm run version:built`** so branch previews
also upload any new original content before publishing a version. The build
needs Git LFS source files as before. Wrangler must have permission to write R2
objects and deploy Workers. Originals upload first; a failed upload stops the
deployment so new gallery URLs cannot be published without their files.

`npm run upload:gallery` uploads only originals referenced by the generated
manifest, verifies their content hashes, and sets image MIME types and immutable
cache metadata. Uploads use Standard storage (the class with the R2 free tier).
Fresh checkouts generate the same original keys regardless of filesystem dates.
Old R2 objects are retained for cached URLs and deployment rollbacks; uploads
never delete objects. Monitor storage as photographs are replaced over time.

`public/.assetsignore` is copied to `dist/` by Vite and excludes all full originals
from Wrangler's static asset upload, including images larger than 25 MiB. Local
Vite development and `npm run preview` still serve the full files from disk.
`npm run upload:gallery -- --local` seeds Wrangler's local R2 emulator for testing;
after building, run `npx wrangler dev` to test the actual Worker route locally.
The Worker streams originals, supports GET/HEAD and ETag revalidation, and caches
successful GETs at the edge. Its requests use Workers quotas as well as R2
operations; other site assets continue through Static Assets.

References: [R2 Worker bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/),
[static asset exclusions and routing](https://developers.cloudflare.com/workers/static-assets/binding/),
and [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

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
