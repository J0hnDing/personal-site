# Content model

The editable portfolio content lives in [`src/content.ts`](../src/content.ts). The file exports both the individual collections and a `content` object for consumers that prefer one import. Keep the data source-backed: project details, images, links, and contact details should be added only when they are available.

## Profile

`profile` contains the full displayed name, an introduction shared by Home and About, and an `introIsDraft` flag. The current introduction includes John's supplied fourth-year Computer Science and Mathematics studies at the University of Toronto. Home renders `John` and `dinG` in two aligned Major Mono Display lines. The four role lines and their accompanying line icons are defined in `Landing.tsx`. There is no tagline field.

The longer About copy lives in `src/pages/AboutPage.tsx`. Its study and AI interests come from the supplied introduction; photography, tennis, piano, and beginner Brazilian jiu-jitsu were confirmed through Atlas. Keep private contact information and identifiers out of the biography.

## Projects

`projects` contains the four project records already used by the site:

- `slug` is the stable route segment.
- `title` is the display name.
- `index` is the two-digit display index (`01` through `04`).
- `accent` is the project color in CSS hex format.
- `description` and `context` contain source-backed public descriptions and context.
- `technicalDetails` is a list of confirmed technical notes.
- `images` contains `{ src, alt, caption }` records.
- `links` contains `{ label, href }` records.

Each project also has `tagline`, `category`, `stack`, three `features`, a `limitation`, and an optional `flow` containing a title, introduction, and selectable explanatory steps. `flow: null` omits the technical diagram when the available source cannot support one. The detail component lives in `src/pages/ProjectDetailPage.tsx`, with styles scoped in `src/pages/project-detail.css`.

The October 2, 2026 project content was checked against the local Eidolon, Eidolon-Atlas, and Projector READMEs and implementation, plus Cubic's public README. Images and public links are recorded in each project. Screenshot origins and capture limitations are documented in `docs/PROJECT_SOURCES.md`; keep published screenshots distinct from new live captures.

## Project images and Gallery

Place project images under `public/`, for example `public/images/project-overview.webp`, then reference them with the root-relative path `/images/project-overview.webp` in a project's `images` array. Keep `alt` text and captions accurate to the supplied asset.

Gallery photographs live in `photos/`. Files directly in that directory appear under “All photographs”; create named subfolders, such as `photos/Travel/`, to organize additional collections. Nested folders are supported. `/gallery` lists collections; opening a folder shows its child folders and direct photographs, with an enlarged viewer for individual images. Empty folders appear as empty collections. Folder names and filenames supply labels without invented locations or subjects.

The current 48 photographs have been visually classified into six source folders: Animals (22), City & Architecture (11), Desert (4), Landscapes (7), Sky & Stars (3), and Details (1). Classification follows the dominant visible subject, without inferred locations or dates. Original filenames and image bytes are preserved. See `docs/PHOTO_COLLECTIONS.md` for the category boundaries. The recursive `photos/**` Git LFS rule covers originals inside these folders.

`npm run dev` and `npm run build` generate 1800-pixel WebP derivatives and a folder manifest under the ignored `public/gallery-assets/` directory; add or replace source photographs rather than editing generated files. Run `npm run prepare:gallery` and refresh the page after changes while the dev server is running. Home still uses the flat manifest photo list for its existing irregular spatial canvas.

Full originals are generated under `public/gallery-assets/__originals__/` with
content-based filenames. Browser-readable source files are copied without
compression; TIFF uses lossless PNG. Local dev and preview serve these files
directly. Cloudflare excludes this directory from Static Assets and serves it
from the `GALLERY_ORIGINALS` R2 binding instead. Use `npm run deploy` locally or
`npm run deploy:built` after the Cloudflare build; these upload the current
manifest's originals before publishing the Worker. See the README for initial
R2 setup. Updating a photograph gives it a new URL while old uploaded originals
remain available for previous deployments and browser caches.

## Thoughts

`thoughts` is an array of `Thought` records. Each record has a route `slug`, display `title`, `kind`, an `excerpt`, and ordered `blocks`. A block has one of three `type` values: `heading`, `paragraph`, or `quote`.

The collection contains John's twelve supplied questions. `/thoughts` lists them and links to their existing detail pages. Their excerpts and body blocks stay empty until John's writing is supplied. `isSample` remains available to explicitly identify demonstration copy if it is added later.

## Contacts

`contacts` provides the four requested labels: Email, X / Twitter, WeChat, and Instagram, rendered in About’s Contact section at `/about#contact`. Each starts with `value: null` and `href: null`. Configure a clickable channel with a display `value` and destination `href`; Email should use a `mailto:` destination. A value without a destination displays as text, which supports a WeChat ID. Leave both fields null to retain the explicit placeholder. Do not add invented contact details.
