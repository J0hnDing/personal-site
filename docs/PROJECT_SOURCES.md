# Project detail sources and captures

Verified October 2, 2026. Public prose describes implemented capabilities; it does not claim metrics, outcomes, or autonomous self-improvement.

## Eidolon

- Public repository: https://github.com/J0hnDing/eidolon-agent
- Local sources: `../Eidolon/README.md`, `backend/app/main.py`, `backend/app/db.py`, `backend/app/services/proposed_skill_service.py`, `backend/app/services/atlas_settings_service.py`, `frontend/src/api/client.ts`, and package manifests.
- `public/projects/eidolon-workspace.webp` and `eidolon-memory.webp` are new live browser captures at 1440×1000. The original backend source was copied to a temporary tree without its data, runtime, skills, or credentials; its existing Python environment served the fresh instance on port 8001. The original frontend ran on port 5175 with `VITE_API_BASE_URL` pointing to that instance. No agent run was triggered. Memory contains three explicitly named demo facts.
- Diagram: need → build approval → generation and backend validation → runtime approval → versioned capability. Scheduled services install paused. Automatic memory selection and experience-driven adaptation remain unfinished.

## Eidolon Atlas

- Public repository: https://github.com/J0hnDing/eidolon-atlas
- Local sources: `../Eidolon-Atlas/README.md`, `docs/core-model.md`, `docs/architecture.md`, `docs/security.md`, `src/index.js`, `src/crypto.js`, and `src/atlas.js`.
- `public/projects/atlas-goal.webp` is a new live browser capture at 1800×1100. `atlas-knowledge.webp` is a new live capture at 1440×1000. `ATLAS_DATABASE` selected a fresh temporary database and `ATLAS_PORT=4818` kept the instance separate from the user's Atlas. The goal, three subgoals, progress, and prerequisites are demonstration data. Knowledge shows the application’s default seeded taxonomy.
- Diagram: passphrase → scrypt-derived memory key → AES-256-GCM payload encryption → SQLite → lock/key discard. Structural metadata remains visible; unlocked native API access trusts local integrations.

## Cubic

- README: https://github.com/J0hnDing/Cubic
- Releases: https://github.com/J0hnDing/Cubic/releases
- The public README identifies an Android game built with Unity. The repository contains README and three images, with APKs distributed through Releases; no Unity source tree was available.
- `cubic-gameplay.webp`, `cubic-level.webp`, and `cubic-menu.webp` are compressed copies of the repository's `image.jpg`, `image (1).jpg`, and `image (2).jpg`. These are genuine existing screenshots, not new live captures. Captions retain that distinction.
- Fresh startup/capture was unavailable: the project is absent locally, and no Android runtime, adb, or Unity executable was found on PATH. No speculative gameplay mechanics or technical diagram were added.

## Projector

- Public repository: https://github.com/J0hnDing/projector
- Local sources: `../Projector/README.md`, package manifests, `src/api.ts`, `src-tauri/src/lib.rs`, `src-tauri/src/agent_api.rs`, and approval/project storage implementations.
- `projector-logo.webp` comes from the real repository asset `src/assets/projector-logo.png`.
- The existing native desktop application was running. Two supported native screenshot attempts failed with `FrameArrived timed out` / `window capture timed out`. No app mockup or unrelated browser rendering was used as a screenshot. Its hero is explicitly labeled a conceptual workflow illustration.
- Diagram: open TODO → agent work → Pending Review → user approval → accepted Markdown history. Rejection leaves canonical Markdown unchanged.

## Asset handling

The seven screenshots and the authentic Projector logo are local WebP assets. Browser captures were compressed at quality 88 without content alteration. The original PNG/JPG files and browser QA screenshots remain in the ignored `.playwright-mcp/` directory; only the WebP derivatives are intended for the site.
