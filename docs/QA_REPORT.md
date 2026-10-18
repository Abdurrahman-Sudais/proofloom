# Proofloom QA — leadership and correction-status revision

Date: 2026-10-18. This edits the existing project. No site was published, deployed or rebuilt from a new template.

## Changes verified

- “The People Building Proofloom” appears at #leadership immediately after #architecture and before #early-access.
- Names/titles: Tolu Akinwale — Founder & CEO; Michael Ugwu — Co-founder & CTO. The owner explicitly confirmed Tolu Akinwale as the actual founder name/title during this revision. Initials are TA and MU. No biographies, photos, qualifications or social URLs were added.
- The shared desktop/mobile main navigation and footer link to /#leadership. The customer segment ID #teams is unchanged.
- Cards retain equal desktop grid columns, stretch alignment, generous padding, ivory/forest-green styling and alignment details. Mobile CSS stacks them at 760px and below. Existing restrained coral details are preserved.
- Reviewer status “Resolution recorded (unverified)” does not change the original displayed Artwork v3. A persistent notice beside the sources says it remains unchanged, containing 500 ml, OHW-500 and missing storage wording.
- Counts say “Recorded resolved.” The detail panel and exported report also distinguish recorded resolution from verified correction.
- Re-review, recorded resolution and the explicit human practice decision remain separate. The checkbox acknowledges that displayed artwork is unchanged and not approved for print. The recorded decision badge says artwork unverified. Editing a finding clears both confirmation and decision.

## Commands actually run

- `npm run build` — passed. Vite client build, server-rendered bundle and Home/Privacy/Terms/Brand/404 static HTML generated.
- `npm test` — all 12 tests passed, 0 failed on the final run.
- `node scripts/offline-preview.mjs` — generated the self-contained review file.
- `node scripts/check-offline.mjs` — passed. jsdom evaluated the embedded app and confirmed hydration without captured console errors, full leadership names/titles, the Team scroll target, footer destination, brand route and embedded assets.
- Static internal link checker — passed across Home, Privacy, Terms and Brand, including section anchors, email and asset destinations.
- Byte comparison against the prior delivered ZIP — 18 contact, document-visual and brand files remain unchanged (Contact, Sources and all 16 brand files).

## Automated test coverage

Demo search and filter intersections, empty results, quantity/code evidence, finding detail open/close, assignment, comments, activity, re-review counts, recorded resolutions, report contents/export handler, reset, separate practice-decision gating, revocation and cleared confirmation. After recording resolutions, the test explicitly confirms that the artwork still contains 500 ml and OHW-500 and that the unverified notice is present.

Email form copy and draft-state handling retain field values and do not claim delivery. jsdom cannot open an email application and emits its expected “navigation not implemented” diagnostic; actual mail handoff is not a passed test.

Generated HTML contains both full leadership names, the exact heading text, two cards, correct section ordering, and /#leadership destinations. CSS definition checks confirm equal desktop columns, a one-column mobile rule and name wrapping. Other checks cover prerendered marketing content, noindex metadata, apex production URLs, legal and 404 rendering, actual brand download targets and favicon PNG dimensions.

## Checks unavailable — not claimed as passed

Real-browser desktop/mobile visual inspection, measured equal card heights, 320px horizontal overflow, native dialog focus, actual device keyboard/screen-reader checks, actual browser download UI, email-client handoff, hosted HTTP status, and social scraper previews.

The environment does not expose the browser-control capability required by the Sites workflow, so no browser or preview server was started. jsdom checks and CSS inspection are not rendered desktop/mobile QA. Inspect the supplied review file in a browser before publication.

## Still requires configuration

AWS services remain proposed, with no live OCR/AI/backend processing. No email delivery backend is configured. Legal/operator and hosting details need finalisation as listed in PRIVATE_HANDOVER.md. Review noindex remains enabled; site remains unpublished.


## Approved-source packaging verification — 2026-10-18

Repeated `npm run build`, `npm test` (12/12 passed), offline preview generation and the offline jsdom check before packaging. Rechecked every static navigation/anchor, legal-route and download-asset target. Compared all src and public files byte-for-byte against the previous approved source delivery: no application or asset changes were made in this packaging request. The recent approved preview also contains the matching full leadership names, leadership anchor and unverified-artwork notices.

The resulting source ZIP includes dependency declarations and lockfile, not the generated node_modules folder. README includes exact npm installation/build/preview commands, numbered Vercel deployment steps, static-host route behaviour, and instructions for removing review noindex while keeping brand/404 excluded. Configuration and real-browser test limitations above remain applicable.
