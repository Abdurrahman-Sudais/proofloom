# Proofloom — unpublished review version

A complete Vite + React + JavaScript website, styled with Tailwind CSS and custom CSS, with Lucide icons. Company origin: https://proofloom.space. Contact: tolu@proofloom.space. No services are deployed or connected. Do not publish until the owner requests it.

## Preview without installation

Open `Proofloom-review-preview.html` from the delivery bundle in a modern browser. It embeds the app, styles and images and provides local page navigation. It is a review convenience, not the deployable build. If your file preview blocks scripts or clipboard access, download and open it in your browser, or use the local server below. Email draft actions still require a configured email application. Brand downloads work as embedded data files in this offline copy.

## Run on your computer

1. Install the current Node.js LTS release (Node 22.12+ or 24) if you do not already have it.
2. Unzip this package. Open a terminal in the `proofloom` folder containing `package.json`.
3. Run `npm ci` once to install the locked dependencies.
4. Run `npm run dev`, then open the Local address printed in the terminal (usually http://localhost:5173).
5. Open `/brand` at the same address for screenshot-friendly logos and downloads. Stop with Ctrl+C.

Exact commands:

```sh
npm ci
npm run dev
```

## Build and test

```sh
npm run build
npm test
npm run preview
```

Run the build before tests: tests import the generated SSR module and inspect the generated HTML. Preview usually runs at http://localhost:4173. The build creates `dist/` with prerendered Home, Privacy, Terms, Brand and 404 HTML. The headline and main description are in HTML before JavaScript runs. Development uses Vite's fallback and React selects routes; production serves the prerendered files. Unknown paths render the real not-found experience. Browser back/forward works via normal page navigation.

`npm test` uses Node tests and jsdom. It is not a real-browser visual, screen-reader, device, or email-delivery test. Test code never sends mail or calls AWS.

## Deploy later to Vercel (only after owner approval)

1. Put the contents of `proofloom` in a GitHub repository you control. Do not upload `node_modules`, `.ssr`, secrets or private handover notes. The `docs` folder is owner handover material; keep it private or remove it before sharing the repository publicly.
2. Import the repository into Vercel. Choose Vite. Use build command `npm run build` and output folder `dist`. Use `npm ci` as the install command. No environment variables are needed.
3. Vercel reads `vercel.json`. Its clean URLs serve `/privacy`, `/terms` and `/brand` from their generated HTML; unmatched routes serve `404.html` with a 404 response. Do not add a catch-all rewrite to `/index.html`.
4. Review the deployment before configuring the domain. In the Vercel domain settings, add **proofloom.space** and use the exact DNS records Vercel displays. No `www` domain is assumed. Preserve business-email DNS records.
5. This package deliberately blocks indexing. Keep the block until launch is intended. It is not access control: Vercel deployment protection must be enabled if a future review URL must stay private.

Other static hosts: upload `dist`, enable directory index resolution for generated route folders, and serve `404.html` for unknown URLs with HTTP status 404. `_headers` supplies review noindex headers on hosts that support that format. Configure equivalent headers elsewhere.

## Indexing switch at approved public launch

- In `index.html`, change `noindex,nofollow` to `index,follow` for the marketing pages. Keep `/brand` unlisted and noindex by adding a route-specific noindex rule in `scripts/prerender.mjs`; always keep 404 noindex.
- Remove the global `X-Robots-Tag: noindex, nofollow` entries in `vercel.json` and `public/_headers`. Replace them with a `/brand` noindex rule and keep the 404 page noindex.
- Replace `public/robots.txt` with:

```text
User-agent: *
Allow: /
Disallow: /brand
Sitemap: https://proofloom.space/sitemap.xml
```

- Finalise Privacy and Terms, confirm operator facts, run `npm run build` and `npm test`, then deploy only when instructed. Review-specific indexing tests must be updated deliberately when launch is approved.

## What is real and what is sample

Implemented: sample review search/filter, evidence selection, accessible native finding dialog, assignments, comments, correction/re-review status, activity, explicit human sample decision, text report export, reset, email-draft form, copy fallback, legal draft routes, brand downloads, metadata and static prerendering.

Demo state is in page memory only. Reload or reset restores the seed. Documents and reviewers are fictional. Reports are plain-text sample review reports. A local status change does not alter artwork. “Resolution recorded (unverified)” is explicitly a reviewer assertion. The original Artwork v3 still shows the three discrepancies; a visible notice states this beside the documents. The practice human decision requires all three resolutions recorded and a separate confirmation that the artwork remains unverified and is not approved for print. Changing a finding clears that confirmation and revokes the practice decision.

Not connected: file uploads, OCR, AI comparison, AWS storage, authentication, real collaboration, production approvals, email delivery or analytics. The AWS section is explicitly proposed. No API keys are required. Do not place secrets in public `VITE_` variables.

## Project structure

- `src/App.jsx`: marketing, navigation, legal and brand routes.
- `src/Demo.jsx`: sample review workspace.
- `src/Sources.jsx`: specification and artwork visuals.
- `src/Contact.jsx`: email draft and copy fallback.
- `src/Team.jsx`: confirmed founder cards; optional biography/photo/social fields remain absent until supplied.
- `src/model.mjs`: sample data, filtering, status counts and report generation.
- `src/style.css`: responsive visual system, focus and reduced-motion rules.
- `scripts/prerender.mjs`: static route HTML and metadata.
- `public/brand`: original vector logo, transparent PNG exports, icons and social image.
- `tests`: model, generated output and simulated DOM checks.
- `docs`: QA, private handover and optional Product Hunt draft.

Fonts: system Arial/Helvetica and Georgia/Times New Roman fallbacks; no webfont downloads. The supplied logo wordmark is outlined from DejaVu Sans and is editable vector geometry. See `THIRD_PARTY_NOTICES.md` and bundled font licence.

Brand regeneration is optional: `python scripts/make-brand.py` needs Python fontTools and the listed DejaVu font path. `node scripts/rasterize.mjs` needs Sharp installed or an absolute SHARP_PATH. Finished SVG/PNG files are included; neither tool is needed to run or deploy the website. The social graphic contains editable SVG text; core logo wordmark glyphs are paths.

To regenerate the optional offline preview after building: `node scripts/offline-preview.mjs`. It writes `../Proofloom-review-preview.html`.


## Confirmed leadership revision

The People Building Proofloom appears after Architecture and before Early Access, at `/#leadership`. The header/mobile menu and footer all include Team links to that section. The customer-segments anchor `#teams` is preserved. Cards show Tolu Akinwale — Founder & CEO (confirmed actual name/title by owner during this revision) and Michael Ugwu — Co-founder & CTO. Initials TA and MU are used. No biographies, photos or social links have been added.


## Source ZIP contents and dependencies

This is the complete runnable project, not only a standalone HTML preview. It includes all application modules, public assets, brand and legal routes, build configuration, scripts, tests, package.json, package-lock.json, .env.example, and the generated dist output. Dependency declarations and exact resolved versions are included; run `npm ci` to install them. The generated node_modules folder, caches and secrets are intentionally excluded.

The optional offline preview is included beside the proofloom folder. It is not a substitute for the source project or deployment output.
