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

Graphite supports silver type, muted sage, and dusty violet. The palette keeps color without a bright dominant surface. The gallery uses a subdued lavender, and writing retains a calm light surface. Space Grotesk carries structural typography, Georgia provides an italic counterpoint, and DM Mono marks indexes and computational annotations. Fonts are served locally.

The landing presents a stacked sans-serif name with a restrained surname indent and generous space around it. Four italic serif role lines follow with open vertical spacing and alternating horizontal offsets. At desktop widths of 1280px and above, the name sits farther inward and the developer and thinker lines extend toward the center to connect the text composition to the figure. The primary composition is checked at the full 1920px desktop width, with smaller type and offsets for mobile and short landscape screens; the mathematical figure retains its existing placement. Five unboxed navigation words link to Home, Projects, Gallery, Thoughts, and Contact. About is reached through the quick introduction's “More about me” link. The full project index, gallery, thoughts, and contact content follow on the same page; individual project and thought details remain separate routes.

## Motion

The 21-language greeting sequence fades out instead of moving upward. Its code background stays mounted behind Home, while the mathematical figure fades in and the name rises through a mask. Scrolling reveals A Student, A Software Developer, A Photographer, and A Thinker in that order below the name. The quick introduction follows the hero.

`useTextReveals` applies a shared bottom-up entrance to headings, paragraphs, captions, and relevant links/rows, including content added later. The hero owns its own scroll-driven masks. Navigation stays available as five text links, with no logo, tagline, border, or bar background.

Reduced motion bypasses the greeting and pinned sequence and presents all roles and other text immediately. The footer motion toggle retains the user's current position. The cursor companion and existing canvas frame/DPR limits remain in place. Canvas drawing pauses offscreen and on hidden tabs. All scrolling stays native.

## Content boundaries

Only the four supplied project names are treated as project facts. Empty visual frames are explicitly labeled. The editable introduction uses the study background supplied by John. The gallery has no stock photography; actual images will activate its staggered collection and dialog viewer. One sample thought is explicitly identified as a layout demonstration, not John's writing. Contact destinations remain unset.
