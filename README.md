# DustinCourageous.com — Netlify Build

Static multi-page site using the approved Dustin Courageous assets supplied in this project.

## Deploy
1. Upload this folder (or the ZIP contents) to a Netlify site, or connect it to a Git repository.
2. Publish directory: `.`
3. Netlify Forms will detect the contact and Adventure Club forms after deployment.
4. Add the final pre-order/purchase URLs when available.
5. Connect `dustincourageous.com` in Netlify Domain Management when ready.

## Current launch data
- Book 1: August 31, 2026
- Book 2: September 30, 2026
- Books 3–5: planned by Thanksgiving 2026
- Paperback: $12.99
- Hardcover: $19.99
- Contact: info@dustincourageous.com

## Latest update
- Adventure Club page refreshed with the approved black/red/yellow cave artwork and parent/guardian reservation form.


## Netlify publish directory
Deploy from the repository root. Leave Base directory blank and set Publish directory to `.`.


Final mobile homepage wordmark update: uses assets/images/mobile-no-fear-wordmark-APPROVED.png above the approved mobile hero, with no overlap or cropping.

V17 mobile homepage update:
- Uses mobile-no-fear-wordmark-WEB-FINAL.png only on the mobile homepage.
- Wordmark is rendered on the same black background as the page, with no transparent white-gap artifacts.
- Wordmark and hero are separate stacked sections: no overlap, no crop, no hero repositioning.


## V18 update
- Added the Book One “Begin the Adventure” interactive flip-through to the homepage and Books page.
- Includes the approved cover and selected preview pages, desktop/mobile controls, swipe support, keyboard navigation, final pre-order CTA, and Collect the Series panel.
- Series dates: Book 1 August 31, 2026; Book 2 September 30, 2026; Books 3–5 November 2026.


## V19 production optimization
- Book 1 preview uses only the eight approved preview images.
- Preview pages converted to high-quality WebP without changing dimensions or layout.
- Preview images lazy-load when the interactive preview opens.
- Existing homepage, mobile hero, pages, forms, modals, and navigation remain unchanged.

## V21 update
- Added complete DC Shield favicon and Apple/Android icon package.
- Added root favicon.ico and web manifest.
- Updated every HTML page to reference the new favicon assets.

## V22 homepage trust-first update
- Added a clear trust/value section above the approved hero.
- Added Parents & Grandparents messaging and two primary actions.
- Preserved the approved desktop/mobile hero, book preview, buttons, favicon package, and all existing functionality.
- Reframed the later family section to avoid repeating the same headline.


## V23 Launch Candidate
- Trust-first homepage intro above the approved hero
- Parents and grandparents messaging
- Desktop Books page CTA/card layout polish
- Existing mobile layouts, Book One preview, Adventure Club, and approved assets preserved

## V23.2 Launch Edition
- Uses a new DC Shield favicon filename on every page to bypass stale browser caches.
- Replaces the conventional root `favicon.ico` with the verified DC Shield icon.
- Adds Netlify `_headers` rules that prevent favicon and manifest caching during the refresh.
- Keeps all V23.1 layouts, previews, forms, artwork, and functionality unchanged.
