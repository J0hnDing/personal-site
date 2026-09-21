# Portfolio design

## Reference study

Reviewed the live references in a browser before implementation, including their opening compositions and scroll states. These were studies in visual behavior, not sources for copied assets, copy, or layouts.

- [Dennis Snellenberg](https://dennissnellenberg.com/): multilingual greeting, generous scale, a name that extends beyond the frame, and continuity between large forms and navigation.
- [Ansyn](https://ansyn.me/): a brief greeting into a dispersed typographic field, restrained metadata, and a personal rather than corporate voice.
- [Khanh Nguyen](https://khanhnguyen.design/): exceptionally large editorial typography, frame edges as a compositional tool, and substantial changes in composition across scrolling chapters.
- [Lama Lama](https://lamalama.com/): a coherent visual world, confident contrasts in scale, compact navigation, and visual transitions that carry the identity through the page.
- [JIEJOE](https://www.jiejoe.com/): expressive oversized type, geometric interaction, and deliberate movement between compositions.
- [Antoine Wodniack](https://wodniack.dev/): a graphic system that extends through scrolling, strong color, and typography acting as image.

## Original direction

The recurring aperture joins three activities without pretending to be a product logo: building systems, looking through a camera, and turning an idea around. The landing develops it into a procedural, rotating torus-knot study; SVG apertures carry the motif into project and gallery pages. Geometry never substitutes for a product screenshot or photograph.

Graphite supports silver type, muted sage, and dusty violet. The palette keeps color without a bright dominant surface. The gallery uses a subdued lavender, and writing retains a calm light surface. Space Grotesk carries the majority of structural UI, Major Mono Display carries the Home identity and roles without typographic modification, Georgia remains a restrained long-form counterpoint, and IBM Plex Mono is reserved for computational notation and indexes. Fonts are served locally.

The landing presents `John` and `dinG` as two monumental, perfectly aligned Major Mono Display lines. The four-letter names share the same natural monospaced width. On desktop, the visible top of `John` aligns with the navigation. The four roles form one substantial left-aligned column beneath it, use the same unmodified display face, and retain a quiet line icon after each label. Mobile clears the navigation and uses a narrow-screen size step only for the longest role. The unchanged mathematical figure holds the right side. Five unboxed navigation words link to Home, Projects, Gallery, Thoughts, and Contact. About is reached through the quick introduction's “More about me” link. The full project index, gallery, thoughts, and contact content follow on the same page; individual project and thought details remain separate routes.

## Motion

The nine-greeting sequence fades out instead of moving upward. Its code background stays mounted behind Home, while the mathematical figure fades in and the name rises through a mask. The name remains fixed during the pinned hero. A small open chevron drifts at the bottom center and fades away as scrolling begins. A short `180svh` sequence reveals the four roles in order, replacing the former `340svh` desktop and `320svh` mobile distances. The quick introduction follows the hero.

`useTextReveals` applies a shared bottom-up entrance to headings, paragraphs, captions, and relevant links/rows, including content added later. The hero owns its own scroll-driven masks. Navigation stays available as five text links, with no logo, tagline, border, or bar background.

Reduced motion bypasses the greeting and pinned sequence, presents every role immediately, and leaves the scroll chevron static. The footer motion toggle retains the user's current position. The cursor companion and existing canvas frame/DPR limits remain in place. Canvas drawing pauses offscreen and on hidden tabs. All scrolling stays native.

## Projects — September 21 refinement

The project index follows the current landing's near-black (`#0b0c0d`) background, silver text, floating point field, and restrained typography. Khanh Nguyen's Chapter II informed the two-column composition: a 60/40 split gives the larger left side to a substantial Montserrat `PROJECTS` title and a bottom-aligned empty image frame; the narrower right side contains only the four smaller project names and fine separation rules, followed by an inactive `View All Work` action. Project names rest in a noticeable soft gray and brighten to the current silver on hover or keyboard focus without moving. Each desktop row reserves a 56px northeast arrow that fades and scales from its bottom-left corner without shifting the name; the arrows stay hidden on mobile. Existing project names and detail routes remain intact. The empty frame is ready to display the active project's first real image when one is supplied. The full-width desktop composition is the primary reference, while mobile stacks the visual area above the project list.

## Content boundaries

Only the four supplied project names are treated as project facts. Project media areas remain visibly empty until real images are supplied. The editable introduction uses the study background supplied by John. The gallery has no stock photography; actual images will activate its staggered collection and dialog viewer. One sample thought is explicitly identified as a layout demonstration, not John's writing. Contact destinations remain unset.
