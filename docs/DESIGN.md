# A work in curiosity

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

The landing presents John Ding's full name and “Finding beauty / in the logic.” A large mathematical wire form turns with time, pointer movement, and scroll. Scrolling shifts its center and scale as the name gives way to “Between logic & possibility.” The introduction lives on a separate About page. A destination index provides direct routes to the rest of the site.

## Motion

The multilingual greeting emerges from a soft blur and holds its opening English “Hello” for 1.5 seconds. It then accelerates through the middle of 21 interleaved languages and writing systems, progressively decelerates, and settles on Simplified Chinese “你好” for a 1.5-second hold. The sequence runs over staggered computational glyphs and Lissajous contours, followed by a curved upward curtain. It is session-scoped, skippable, and bypassed for reduced motion. Page changes use a brief nonblocking shutter; project rows and destination links reveal on entering view. Text decoding preserves link dimensions.

The landing uses a native sticky section, with scroll-driven geometry, type movement, and a two-phase crossfade. Opacity uses function-derived MotionValues so it shares the geometry's timeline instead of producing divergent native ViewTimeline interpolation. The Transform button changes the form with a spring. Header navigation stays available throughout the sequence.

The cursor mark is a small mathematical crosshair that follows and expands around real controls. It preserves the browser cursor and never intercepts input; touch and reduced-motion users do not receive it. Canvas work is capped at 40 FPS and DPR 1.75, pauses offscreen and on hidden tabs, and uses no per-frame React rendering. Reduced motion renders full static geometry and collapses the pinned sequence. Scrolling remains native.

## Content boundaries

Only the four supplied project names are treated as project facts. Empty visual frames are explicitly labeled. The draft introduction is editable and marked. The gallery has no stock photography; actual images will activate its staggered collection and dialog viewer. One sample thought is explicitly identified as a layout demonstration, not John's writing. Contact destinations remain unset.
