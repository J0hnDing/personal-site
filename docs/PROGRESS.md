# Progress checkpoint — September 15, 2026

## Completed

- Converted Home into one continuous page: name and roles, quick introduction, Projects, Gallery, Thoughts, Contact.
- Replaced the branded header/menu with five text links, including Home. About remains reachable from More about me.
- Removed redundant page kickers, slogans, and repeated placeholder headlines.
- Kept the intro's code background mounted; greetings fade away, the figure fades in, and the stacked sans-serif name rises from below.
- Added sequential scroll reveals for A Student, A Software Developer, A Photographer, and A Thinker.
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
