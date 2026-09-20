# Content model

The editable portfolio content lives in [`src/content.ts`](../src/content.ts). The file exports both the individual collections and a `content` object for consumers that prefer one import. Keep the data source-backed: project details, images, links, and contact details should be added only when they are available.

## Profile

`profile` contains the full displayed name, an introduction shared by Home and About, and an `introIsDraft` flag. The current introduction includes John's supplied fourth-year Computer Science and Mathematics studies at the University of Toronto. Home renders `John` and `dinG` in two aligned Major Mono Display lines. The four role lines and their accompanying line icons are defined in `Landing.tsx`. There is no tagline field.

## Projects

`projects` contains the four project records already used by the site:

- `slug` is the stable route segment.
- `title` is the display name.
- `index` is the two-digit display index (`01` through `04`).
- `accent` is the project color in CSS hex format.
- `description` and `context` accept text or `null`; they are `null` until confirmed copy is available.
- `technicalDetails` is a list of confirmed technical notes.
- `images` contains `{ src, alt, caption }` records.
- `links` contains `{ label, href }` records.

The project records currently use empty arrays and null fields so the interface can render clear placeholders without implying project facts. Add confirmed content directly to the matching record.

## Images and public paths

Place an image file under `public/`, for example `public/images/project-overview.webp`, then reference it with the root-relative path `/images/project-overview.webp` in an image `src`. Keep `alt` text and captions accurate to the supplied asset. The same convention applies to future photography records. Photography is intentionally an empty typed array until real photographs are supplied.

## Thoughts

`thoughts` is an array of `Thought` records. Each record has a route `slug`, display `title`, `kind`, an `excerpt`, and ordered `blocks`. A block has one of three `type` values: `heading`, `paragraph`, or `quote`.

The collection contains one `Sample thought` titled “On noticing” so the reading layout has content during development. It has `isSample: true` and its copy explicitly identifies it as a typography sample. Replace the sample fields with your own writing before publishing, and set `isSample` to `false`.

## Contacts

`contacts` provides the four requested labels: Email, X / Twitter, WeChat, and Instagram. Each starts with `value: null` and `href: null`. Configure a clickable channel with a display `value` and destination `href`; Email should use a `mailto:` destination. A value without a destination displays as text, which supports a WeChat ID. Leave both fields null to retain the explicit placeholder. Do not add invented contact details.
