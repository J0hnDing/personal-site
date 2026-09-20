# Progress checkpoint — September 15, 2026

## Completed

- Converted Home into one continuous page: name and roles, quick introduction, Projects, Gallery, Thoughts, Contact.
- Replaced the branded header/menu with five text links, including Home. About remains reachable from More about me.
- Removed redundant page kickers, slogans, and repeated placeholder headlines.
- Kept the intro's code background mounted; greetings fade away, the figure fades in, and the two aligned name lines rise from below.
- Reveals a Student, a Software Developer, a Photographer, and a Thinker in a short pinned sequence while the name stays fixed.
- Applied a shared bottom-up reveal to content text, including content added later; preserved reduced-motion behavior.
- Added John's supplied fourth-year Computer Science and Mathematics studies at the University of Toronto to the introduction.
- Preserved existing project content, empty photography, labeled sample thought, and contact placeholders. Former index URLs redirect to their Home sections; detail pages remain available.

## Validation

TypeScript, Vite production build, formatting, and diff checks passed. Browser checks covered desktop, 768px tablet, 390px mobile, and 320px mobile; no horizontal document overflow was found. Verified five navigation links on one line at 320px, sequential role states, About, section navigation, project detail and Back, direct URL redirects, and the manual reduced-motion mode. See VALIDATION.md.

## Handoff

Development preview: http://127.0.0.1:5173/. No commit, push, or deployment. No implementation work remains for this requested revision. Projector work history is submitted as a pending proposal. Real project media, photographs, authored writing, and contact details remain to be supplied.

## Follow-up visual correction

Restored the original sans-serif JOHN / DING. name structure and figure number/title/study metadata. Removed central code-contour decoration after the intro while retaining the code glyph background. Raised and sized the figure to clear the bottom edge; mobile places it below the roles. Rechecked desktop, mobile, and short landscape layouts and all five figure metadata states. No additional Projector history proposal was created for this refinement.

## September 16 — Hero typography and spacing

Rebalanced the name with a smaller scale, more surrounding space, and a subtler surname indent. Set the existing role copy in italic serif type with wider vertical spacing and alternating horizontal offsets. Preserved figure positioning, content, and scroll reveal behavior. Fixed stale role opacity when switching motion off. The pre-existing App, Landing, and ScrambleText edits were preserved.

Used the monitor's full 1920px width as the primary visual reference, checking 1920×1080 and 1920×960 opening and revealed compositions. Also inspected 1440×900, 768×1024, 390×844, 320×568, and 844×390 layouts. TypeScript, the Vite production build, CSS formatting, and diff checks passed. Manual motion-off mode displays every role immediately; no browser errors or horizontal overflow were found. No commit, push, or deployment.

Follow-up: moved the desktop name inward and spread the role lines farther toward the center to reduce the empty middle. Applied these wider offsets at 1280px and above, preserving the compact layouts and graph placement. Visually rechecked 1920×960, 1920×1080, and 1280×800; TypeScript, production build, formatting, and diff checks passed. This refines the same work; no additional Projector history proposal was created.

## September 19 — Editorial hero recomposition

Replaced the old stacked name and staggered role offsets with a monumental single-line JOHN DING. identity and one coherent left-aligned role block. Bricolage Grotesque now carries the hero name and roles, with a restrained weight contrast between the two name parts and the lavender period retained as the signature. Added small line icons after each role and removed the former serif italic treatment, indicator-like offsets, and obsolete wide-desktop positioning rules.

Preserved the mathematical renderer, canvas placement, figure switching, scroll-driven role sequence, intro timing, palette, navigation, and reduced-motion bypass. Replaced DM Mono with locally bundled IBM Plex Mono for the technical notation layer while retaining Space Grotesk across the broader UI. TypeScript and Vite builds, formatting, scoped diff checks, figure switching, console checks, and rendered full-screen desktop, 390px, 320px, and short-landscape checks passed with no horizontal overflow. No commit, push, or deployment.

Follow-up: replaced the Bricolage hero treatment with unmodified Major Mono Display. Returned the name to two lowercase aligned lines, sized it substantially larger, and aligned its visible desktop top with the navigation. Because both names contain four letters, their monospaced widths match while the lavender period projects into a fifth cell. Updated the roles to `a Student`, `a Software Developer`, `a Photographer`, and `a Thinker` in the same face. Kept mobile header clearance and added a 320px-only role size step so the longest label and icon remain complete.

Follow-up: removed the role block's scroll transforms and delayed opacity entirely so every role is present immediately. Increased the name line height to expose the complete lower strokes and optically shifted the name so its visible glyph edge aligns with the roles. Rechecked full-screen desktop and mobile alignment, initial role visibility, and narrow-screen fit.

Follow-up: restored only the roles' scroll-driven reveal and removed the name's former scroll lift. Shortened the pinned hero to `180svh` on desktop and mobile, down from `340svh` and `320svh`. All four roles finish revealing well before the next section enters, while reduced-motion mode continues to show them immediately.

Follow-up: removed the period from the display name and changed its visible casing to `John` / `dinG`, preserving the equal-width stacked alignment.

Follow-up: added a text-free open chevron at the bottom center of Home. It uses a subtle vertical drift and opacity pulse, fades out over the opening portion of the role-reveal scroll, and becomes static when motion is disabled or reduced.
