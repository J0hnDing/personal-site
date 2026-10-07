## TODO-001: Capture fresh live screenshots for Cubic and Projector

- Priority: low
- Category: documentation
- Area: Project detail media
- Dependencies: none
- Rationale: Visual detail pages are implemented. Cubic has published README images but lacks a local Android runtime/source checkout; two native Projector screenshot attempts timed out.

-Acceptance Criteria:
Capture the actual Projector desktop interface without private records; run Cubic in an Android runtime and capture gameplay; replace or supplement assets, preserve accurate captions, and update docs/PROJECT_SOURCES.md.

## TODO-002: Activate R2 and deploy gallery originals

- Priority: high
- Category: bugfix
- Area: Gallery deployment
- Dependencies: none
- Rationale: The R2 integration is implemented and locally validated, including unchanged 39.52 MiB original delivery. Remote creation/upload is blocked because Cloudflare reports R2 is disabled (API code 10042).

-Acceptance Criteria:
Enable R2 in the Cloudflare account; create john-ding-gallery-originals; upload the current manifest originals; set Cloudflare Builds deploy command to npm run deploy:built; deploy and verify a production original exceeding 25 MiB without quality loss.
