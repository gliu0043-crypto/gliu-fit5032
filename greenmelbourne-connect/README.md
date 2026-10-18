# GreenMelbourne Connect

Vue 3 + Composition API application for a Melbourne environmental not-for-profit.

Live site: https://greenmelbourne-connect-801602918282.web.app

## 18 October upgrade — BR E.3, E.4 and two F.1 features

Implemented with Codex assistance at the project owner's request. This records assistance honestly; it does not establish permission under the unit's GenAI rules or guarantee a grade. The selected F scope is **interactive charts** and **bulk email**, not four innovations. The existing organiser page and the two chart types are not counted as additional F features.

**Status:** implementation, production build and local verification complete. Firebase Hosting and `gmcSendActivityEmail` were updated successfully on 18 October 2026 at the existing URL. No real email was sent during automated verification. The owner reported successful guided acceptance, including real two-recipient bulk-email receipt and readable attachments, on 18 October 2026. The owner authorised the Git commit and push on 18 October 2026. Commit title: `Add accessibility, data exports, interactive charts and bulk email`.

### Accessibility (E.3)

- A keyboard-visible skip link bypasses navigation. Route changes move focus to the new page heading and update the document title. Mobile navigation reports its open state and Escape returns focus to its toggle.
- Visible focus outlines, stronger form borders/text contrast, reduced-motion support and reflow at 320 CSS pixels.
- Form errors are associated with their inputs via `aria-describedby` and `aria-invalid`; invalid submissions focus the first invalid control. Login/register use labelled toggle buttons instead of incomplete tab semantics.
- Map destination selection and route metrics are available as labelled controls and text outside the map. Charts expose exact values in an HTML table and have equivalent keyboard controls.
- Automated axe-core checks use WCAG 2.0/2.1 A and AA tags across 14 page/form states, alongside keyboard actions, route focus, member access restrictions and a 320-pixel viewport. Zero detected violations on these checks is **not a full WCAG conformance certification**. The owner's keyboard and approximately 200% zoom checks are recorded below; comprehensive screen-reader testing remains outside the completed coverage.

### Data export (E.4)

Both organiser tables have **Export CSV** and **Export PDF**. They export every matching row across all pages, in the current sort order, using explicitly selected display columns. Internal IDs and action controls are excluded; registration reasons are not added to the Activity export column. Empty/loading/error states disable export. CSV uses UTF-8 with a BOM, correct quote escaping and formula-prefix neutralisation. PDFs have repeated headers, wrapped cells, page numbers and an embedded open-source font for English/Simplified Chinese. The roughly 10 MB font is loaded only when PDF export is requested; uncommon characters outside its coverage are not promised.

PDFs are generated locally using jsPDF + AutoTable; no participant data is sent to a PDF service. The bundled font is Noto Sans SC from Google's fonts repository, instantiated at weight 400 with FontTools; its SIL Open Font License is included at `public/fonts/OFL.txt`. Source: https://github.com/google/fonts/tree/main/ofl/notosanssc . CSV and the on-screen table remain available as textual alternatives; PDF/UA tagging is not claimed.

### Interactive charts (F.1 feature 1)

**Activity insights** shows registration counts by activity and Waiting/Contacted totals using Chart.js. Filter by activity type, activity suburb, individual activity and status; click bars or doughnut segments to filter, or use the equivalent selectors/buttons. Reset restores all data. An expandable HTML table exposes exact figures and keyboard focus buttons. Counts reflect registration records (expressions of interest), not unique participants or confirmed reservations. Activities with no registrations have zero counts. The data comes from existing Firestore subscriptions; demo chart statistics are not fabricated in production.

### Bulk email (F.1 feature 2)

The organiser can filter registrations, select up to 10 recipients (including My email), compose once, attach one file and review the exact recipients before confirming. Each unique address receives a **separate** message, so recipients do not see each other's addresses. Server-side validation re-resolves registration addresses, checks organiser permissions and validates attachment bytes before delivery.

The existing endpoint now accepts a `recipients` array for a batch. `gmcEmailBatches` stores only an immutable manifest fingerprint; `gmcEmailRequests` stores per-address attempt/outcome records. Both are inaccessible to browser clients. Deterministic per-batch/per-address request identifiers reuse successful outcomes and block automatic repeats of uncertain attempts, including after a function restart. A changed batch cannot reuse its identifier. The existing limit remains 20 email attempts per organiser per hour shared with single emails. A provider/rate error pauses later recipients and returns individual outcomes; **Resume / check this batch** can continue recipients never attempted without resending accepted/uncertain ones. Provider acceptance is not proof of inbox delivery.

The Cloud Function timeout is 360 seconds for sequential batches, while retaining one maximum instance and one concurrent request. Keep the page open while processing. Local `email:dev` only simulates sending and its ledger resets when stopped; production uses durable Firestore records. Existing Gmail OAuth testing-mode expiry still applies. A live check must use two owner-approved inboxes and inspect attachments; automated testing does not replace this.

### Verification and guided acceptance

- 42 unit tests: tables (8), maps (8), email including batches (17), Gmail OAuth (6), export/statistics (3).
- 15 emulator integration tests: Firestore rules (8), authentication (1), durable mail store including batch manifests (6).
- 6 browser scenarios, including 14 axe-core scans, actual CSV/PDF downloads, filter/empty-state charts, two-recipient simulated delivery, member registration/rating and 320px navigation.
- Exported PDFs were rendered and visually inspected: 12 filtered activity rows, 23 registration rows over two pages, and 65 English/Chinese rows over four pages.
- Deployment checks: the hosted index matches the tested production build, the downloaded PDF font exactly matches the local file, all 30 production activities load, CORS preflight returns 204 and an unauthenticated email request returns 401. Four additional guest-page axe scans (home, activities, invalid login and 320px home) detected no violations; live skip-link, route-heading focus and invalid-field focus checks passed. Subsequent owner-reported production acceptance is recorded below.

Run `npm test` for unit/integration checks. Run `npm run test:acceptance` for emulator integration plus Chrome browser checks (requires Google Chrome installed). These tests use only `demo-greenmelbourne` on localhost. `seed:tables` resets disposable local Firestore data to 23 activities/registrations; it cannot write to production.

### Owner-reported manual acceptance — 18 October 2026

The owner replied with success after each guided test. These are user-reported results; the assistant did not independently inspect the private inboxes or send the messages.

- E.3 basic accessibility: blank-login errors and first-invalid-field focus, Tab/Shift+Tab navigation with visible focus, the skip-to-content link, and readable/usable layout at approximately 200% zoom.
- Existing-flow checks: member login persists after refresh; members cannot enter the organiser page; activity registrations persist after refresh; ratings save and updates retain the same rating count; the organiser can find the member's registration; activity-table pagination shows 30 records over three pages.
- E.4 CSV: all 30 activity records export across pages; a suburb-filtered export contains only the matching records with the expected count.
- E.4 PDF: activity and registration exports open, match the table data, and have readable text, headings and pagination without reported clipping or garbled characters.
- F.1 interactive charts: activity selection, reset, clicking a populated bar, and Waiting/Contacted filtering keep charts and totals consistent, including empty results.
- F.1 bulk email: the owner reviewed two distinct owner-controlled recipients, the subject/body and the sample TXT attachment, then performed the send. They reported success for the requested checks: both recipient results accepted, both inboxes received the email, attachments opened correctly, and each email exposed only its own recipient address.

The live batch check covered two recipients and the sample TXT file. The 10-recipient limit and retry/idempotency behavior have automated coverage; they were not separately exercised by sending another live batch. Full WCAG conformance is not established by this guided acceptance. Before the authorised Git commit, all 57 unit and emulator integration tests and the production build passed again on 18 October 2026.

Implementation references: [W3C WCAG 2.1 understanding](https://www.w3.org/WAI/WCAG21/understanding/), [Chart.js interactions](https://www.chartjs.org/docs/latest/configuration/interactions.html), [jsPDF](https://github.com/parallax/jsPDF).

## Day one implementation

- Firebase Authentication email/password registration, sign-in, sign-out and restored sessions.
- Firestore stores activities (`gmcEvents`), profiles (`gmcUsers`), registrations (`gmcRegistrations`) and ratings (`gmcRatings`).
- New accounts are always members. Only a trusted Firebase project administrator can assign an organiser role.
- Members can read their own registrations; organisers can read all registrations and change follow-up status or delete a record.
- Public activity ratings are limited to one per authenticated member per activity. Submitting again updates that member's rating.
- Loading, pending and failure states are shown instead of reporting unsaved work as successful.
- Firebase Hosting serves the production build and rewrites direct Vue route requests to `index.html`.

## Day two implementation — BR D.3

The organiser page now has two independent Firestore-backed interactive tables:

- **Activities:** activity title, suburb, date, type and places. Title links open the existing detail page.
- **Registrations:** member name, email, activity/reason, suburb, follow-up status and registration date. Existing status updates and confirmed deletion remain available.

Both tables provide ascending/descending column sorting, a global search, individual column search, combined filters, clear filters, result counts and fixed 10-row pagination. Activity dates and places sort chronologically/numerically. Searching or sorting returns to page one; live changes clamp the current page if the last page disappears. Empty results, loading and service errors have distinct messages. Filters and pages are independent between the two tables and reset on reload.

All filtering and pagination happens in the browser over the existing Firestore snapshot. This is suitable for the coursework dataset; larger datasets would require server-side query pagination. A table with 10 or fewer records correctly disables Next. At the project owner's request, the hosted activity catalogue now contains 30 demonstration activities, giving the organiser Activities table three pages of 10. No sample registrations were added to production.

Attachment email/cloud functions are deployed and the owner has verified real receipt with a readable TXT attachment. Map features are also deployed and passed the owner's guided manual acceptance for the Credit target on 15 October 2026.

## Day three deployed and core acceptance passed — BR D.2 and E.1

The organiser page has an email composer with a required attachment (PDF, UTF-8 TXT, PNG or JPEG, maximum 2 MB). Recipients are the authenticated organiser's own email or an existing registration selected from Firestore. The server verifies Firebase identity and the organiser role, resolves the recipient independently of the browser, validates the attachment bytes, and sends plain-text email through a provider adapter. Gmail API, SendGrid and Resend adapters are implemented; provider credentials belong only in the server's secret configuration. Gmail delivery builds a MIME message in memory with Nodemailer and submits it through Gmail's HTTPS API, without using SMTP. The public `VITE_EMAIL_ENDPOINT` variable contains only the endpoint URL.

**Status: cloud function and Hosting deployed; real receipt and attachment readability accepted by the owner on 13 October 2026.** The organiser sent a test email through the hosted website to their own school inbox, confirmed receipt, and supplied a screenshot of `activity-info-example.txt` open in Gmail's attachment preview at 14:28 AEDT. The activity information is readable without garbled text. This verifies the core BR D.2 attachment-email flow through the BR E.1 serverless function. Setup and automated checks did not send real emails. The owner authorised the Day-three Git commit and push on 13 October 2026 after accepting the delivered attachment.

Firebase Blaze and Gmail API are enabled in FIT5032. The school Google account completed OAuth sender consent, and `GMC_EMAIL_CONFIG` version 1 is stored in Secret Manager. The setup helper accepts Google-verified personal Gmail or Workspace addresses; Workspace sending remains subject to the account administrator's policies.

`functions/index.js` implements `gmcSendActivityEmail` in `australia-southeast1`. The Firebase Admin SDK verifies tokens, checks revocation/disabled accounts and reads the organiser role and registration email. The function uses the same shared attachment validation/provider handler as local tests. It scales to zero and is capped at one instance. Server-only Firestore collections `gmcEmailRequests` and `gmcEmailLimits` persist duplicate-request protection and a rolling limit of 20 attempts per organiser per hour. Messages and attachment contents are not stored there. If provider acceptance cannot be confirmed, the same request cannot automatically resend; check the recipient inbox before preparing another email.

Local tests use the same request handler and Firebase REST authentication/Firestore reads, pointed exclusively at the emulators. Start these three commands in separate terminals:

```sh
npm run emulators
npm run email:dev
npm run dev:emulator
```

After the emulators start, run `npm run seed:tables` and sign into `http://127.0.0.1:5178` using the local organiser credentials documented below. The email panel is below the registration table. Download `activity-info-example.txt` from its sample-attachment link, select it, and submit. A successful response explicitly states **No real email was sent**. Local sending is simulated even if unrelated provider credentials exist in the shell environment. Its in-memory duplicate-request guard and hourly attempt limit reset when the local server stops; the Firebase adapter uses the durable Firestore equivalents above. Do not deploy the local HTTP server as a substitute for a cloud function.

`npm run test:email` now runs 17 tests covering role restrictions, trusted recipients, attachment integrity, request limits, duplicate request handling, provider failures, all three provider request formats and batch validation/deduplication/resume behavior. `npm run test:gmail-oauth` runs 6 local callback tests with simulated Google responses, checking OAuth state/PKCE, minimal scopes, credential file permissions, school addresses, rejected consent/account cases and safe diagnostic errors. Neither suite sends real email. Browser checks covered missing-attachment validation, file selection, self and participant recipients, successful simulation and prevention of accidental double-click submission. The hosted organiser page now includes the email composer; the existing authentication and table features remain available.

Cloud-adapter verification on 13 October 2026: the Firebase entry point loaded successfully; all 32 automated tests passed (8 table, 10 email, 8 security rules, 1 authentication integration and 5 Firestore mail-store integration tests). The mail-store tests use only local emulators and cover concurrent duplicate requests, persistence across handler instances, changed replays, uncertain delivery and hourly limit expiry. This does not replace deployed-function and real inbox acceptance testing.

Deployment verification on 13 October 2026: `gmcSendActivityEmail` was created successfully in `australia-southeast1`, using `GMC_EMAIL_CONFIG` version 1. The updated production build passed and was released to the existing Hosting site. Live checks passed for CORS preflight (204), unauthenticated requests (401), invalid identity (401) and an unapproved origin (403), without sending mail. A 7-day cleanup policy was configured for the function build images. The prior test results above and these interface checks do not establish real delivery.

Deployed endpoint: `https://australia-southeast1-fit5032-9edfc.cloudfunctions.net/gmcSendActivityEmail`

Owner's manual acceptance on 13 October 2026:

- Passed: organiser signed in and located **Send activity information** below the two tables.
- Passed: submitting without an attachment showed the required-file validation message.
- Passed: organiser selected the sample TXT attachment, sent the email to themselves and confirmed real receipt.
- Passed: `activity-info-example.txt` opened in Gmail's preview with readable activity information, as shown in the owner's screenshot.

Coverage limits: real delivery was checked with the self-recipient/TXT path. Registered-participant recipients were checked using the local simulated flow; PDF/PNG/JPEG have validation coverage but were not separately sent during this real inbox acceptance. Guest rejection was checked against the deployed endpoint; member/organiser role handling is covered by automated tests. An uncertain response must not automatically resend the same request. Any further participant delivery test should use a consenting test recipient.

The owner completed the core acceptance steps and explicitly approved committing/pushing this Day-three work on 13 October 2026.

References: [Firebase Cloud Functions](https://firebase.google.com/docs/functions), [Gmail sending and attachments](https://developers.google.com/workspace/gmail/api/guides/sending), [Desktop OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app), [OAuth token expiration](https://developers.google.com/identity/protocols/oauth2).

### Firebase email deployment

1. In Google Cloud project `fit5032-9edfc`, enable Gmail API. Configure the Google Auth Platform app as External/Testing, add the chosen Gmail/Workspace sender as a test user, and configure the `gmail.send`, `openid` and `email` scopes. No inbox-reading scope is needed.
2. Create a **Desktop app** OAuth client named `GreenMelbourne Gmail Setup`. Download its JSON and save it locally as `gmail-client.local.json` in this application directory. Run `npm run gmail:authorize`, open the printed local URL in a normal browser and personally approve Gmail sending. The helper checks state and PKCE, confirms the sender's verified Gmail address, and writes `email-config.local.json` with owner-only permissions. No email is sent during setup. Both credential files are ignored by Git; never paste their contents into chat, screenshots or `VITE_` variables. `email-config.example.json` documents the secret shape, without real values. An optional `testRecipient` can restrict acceptance sends to one inbox.
3. Install the function dependencies with `npm ci --prefix functions`. Upload the configuration to Secret Manager, then deploy only this function:

```sh
firebase functions:secrets:set GMC_EMAIL_CONFIG --data-file email-config.local.json --format json --project fit5032-9edfc
npm run deploy:email
```

4. Set `VITE_EMAIL_ENDPOINT` in `.env.local` to the HTTPS URL returned by deployment. Run `npm run build` and deploy only this site's Hosting with `firebase deploy --only hosting --project fit5032-9edfc`.
5. If the sender/OAuth/test-inbox setting changes, upload a new secret version and redeploy the function. The frontend never receives this secret. Only after receiving and opening a real attachment can the delivery requirement be considered accepted.

**Testing-mode expiry:** Google's External OAuth apps in Testing receive refresh tokens that expire after 7 days when requesting Gmail sending access. Before a later demonstration, run `npm run gmail:authorize` again, upload the renewed `GMC_EMAIL_CONFIG` secret and redeploy the function using the commands above. A successful refresh extends access only while that refresh token remains valid. Removing consent also stops sending. Do not assume an October 13 authorisation will remain usable for a demonstration after October 20. Public production use requires a separate review of Google's OAuth publishing/verification requirements.

The deployment pre-hook copies `server/email-handler.js` and `shared/email.js` into the function package. Those generated copies are ignored by Git. Use `npm run functions:prepare` before running the Functions emulator separately. The local mock email server must never be deployed.

## Run against the cloud

Use Node.js 22 or later and install the Firebase CLI (`firebase-tools`).

```sh
npm ci
npm ci --prefix functions
npm run dev
```

The local `.env.local` contains the Firebase web configuration and is ignored by Git. On another computer, copy `.env.example` to `.env.local` and obtain this web app's configuration from Firebase Console > Project settings > Your apps. These are browser Firebase identifiers, not Admin SDK credentials. Never place server secrets or service account keys in `VITE_` variables.

Project: `fit5032-9edfc`
Web app ID: `1:801602918282:web:5db1fb3e7065a319c81a73`
Hosting site: `greenmelbourne-connect-801602918282`
Firestore database: `(default)` in `australia-southeast1`.

Email/password sign-in is enabled. Hosting domains and localhost are authorised.

## Assign the first organiser

1. Register the intended organiser's account through the website. No password should be shared with the developer.
2. As the Firebase project owner, open Firestore > `gmcUsers` and locate that account by email/UID.
3. Change that document's `role` from `member` to `organiser`.
4. The signed-in page receives the profile change and shows the Organiser link. Reload if necessary.

The application cannot grant itself this role. Firestore rules reject client-side role escalation, including direct SDK requests. Do not change rules to allow public role writes.

## Existing browser-only data

The old Local Storage accounts are not Firebase accounts: users must register once with Firebase. Old browser data is left intact but no longer used for authentication, shared registrations or ratings. It is not automatically uploaded or trusted as proof of ownership. Password hashes are not migrated.

The activity catalogue is stored in `scripts/data/events.json` and has been seeded in Firestore. On 12 October 2026, 27 activities were added at the project owner's request, bringing the total to 30 across 28 suburbs and three activity types. The original three records and their IDs were preserved. All dates are in October–December 2026; these are fictional coursework activities, not verified public events. The additional activity titles and descriptions were drafted with AI assistance (Codex), with date, field and uniqueness validation. No registrations, ratings or user profiles were changed. Firestore subscriptions load the new activities without a new Hosting deployment.

## Day four deployed and accepted — BR E.2

**Status: eight map tests and production build pass. Geoapify is configured and Hosting was deployed on 15 October 2026. The owner completed all nine guided acceptance checks on the deployed website on 15 October 2026 and authorised the Day-four Git commit and push after acceptance. Commit title: `Add activity maps and route planning with Geoapify`.**

The new `/map` page provides Melbourne place/address search with a selectable starting point, plus walking/cycling routing to an activity. Leaflet draws Geoapify road/path geometry, distance and estimated duration. Searches require an explicit submit, repeated searches are cached in memory, and changing the start, destination or mode cancels stale requests and clears old routes. Missing configuration, provider failures, empty searches and tile errors have visible messages. Activity details link directly to a selected map destination. Map code is loaded separately from the main page.

The 30 existing activities use approximate fictional suburb meeting points in `src/data/activityLocations.js`. The UI labels these as coursework examples, not confirmed venues. Production Firestore data is unchanged. Search text and trip coordinates are sent to Geoapify; trips are not stored in Firestore or Local Storage. The map includes Geoapify and OpenStreetMap attribution.

Setup:

1. Create a free `GreenMelbourne Connect` project at [Geoapify MyProjects](https://myprojects.geoapify.com/).
2. Restrict its browser key's **Allowed HTTP referrers** to the production Hosting website and local development origins. Geoapify accepts regular-expression patterns. Verify restrictions through the actual website after saving; CORS alone is not an access restriction. See [API key restrictions](https://myprojects.geoapify.com/help/api-keys/).
3. Add `VITE_GEOAPIFY_API_KEY` to ignored `.env.local`, then restart Vite. The production configuration check requires this key. Browser keys are visible in the built app and need referrer restrictions. Do not commit unrestricted keys or include them in screenshots.
4. Run `npm run test:map` and `npm run build`. Validate live tiles, search and both travel modes before deploying Hosting. The email function does not need redeployment for the map.

The configured browser key allows these HTTP referrer patterns:

```text
^https://greenmelbourne-connect-801602918282\.web\.app/.*$
^http://(localhost|127\.0\.0\.1):(5173|5178|5179|4173)/.*$
```

Live checks on 15 October 2026 confirmed the 30-activity catalogue and map tiles. Searching `Clayton`, selecting `Clayton, VIC, Australia`, and routing to `Clayton Community Tree Planting Day` returned a walking route of 2.1 km / 30 min locally and on the deployed website. Cycling returned 2.4 km / 9 min locally. These are provider estimates and may change. Changing destination cleared the old route, Clear trip reset the controls, and a 390-pixel viewport had no horizontal overflow. A request with an unrelated referrer was rejected with HTTP 401. The key remains in ignored `.env.local`; no source files scanned for the Day-four changes contained its value.

Manual acceptance (owner-reported pass on 15 October 2026):

1. Map loading: Melbourne streets, green activity markers, the 30-activity count, and zoom controls work.
2. Place search: searching `Clayton` and choosing a result sets the starting point and shows the blue S marker.
3. Walking route: selecting `Clayton Community Tree Planting Day` and planning a route displays the route line, distance and estimated time.
4. Cycling route: changing travel mode clears the walking result; planning again displays the cycling route and estimates.
5. Destination change: choosing another activity clears the old result; planning again uses the new destination.
6. Clear trip: search, start, destination, route and estimates reset; Walking is restored, Plan route is disabled, and activity markers remain.
7. Activity detail link: opening the map from an activity detail automatically selects that activity.
8. No results and recovery: searching `zzzzzzzzzzzz` shows a no-match message; searching `Clayton` again returns results normally.
9. Phone/narrow layout: form and map stack without clipping or page overflow, controls remain usable, and the collapsed navigation expands.

These checks demonstrate the two non-trivial BR E.2 features: place search and route planning with distance/time information. The owner's acceptance confirms the workflow; automated validation and stale-request tests provide separate coverage for error cases.

Eight automated map checks pass for catalogue coverage, search boundaries/cache/validation, coordinate order and units, invalid/same-point trips, provider errors, and stale search/route cancellation. Production build passes with the existing main-bundle size warning. Mock-response tests do not establish live availability.

References: [Leaflet](https://leafletjs.com/reference.html), [Geoapify geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [routing](https://apidocs.geoapify.com/docs/routing/), [tiles and attribution](https://apidocs.geoapify.com/docs/maps/map-tiles/). Code and fictional location labels were drafted with AI assistance (Codex); include this in the submission's AI acknowledgement.

## Local emulators and automated checks

Requires Java 21+ and Firebase CLI. Tests use only project `demo-greenmelbourne`; they clear this disposable emulator database. Do not point tests at production.

```sh
npm test
```

This runs 8 table-behaviour tests, 8 map tests, 13 email tests and 6 local OAuth callback tests, starts Auth on 9199 and Firestore on 8188, runs 8 security-rule tests, 1 Firebase SDK authentication integration test and 5 durable email-store integration tests, then stops the emulators. Stop separately running emulators before this command. Permission-denied output is expected for explicitly rejected operations.

For interactive emulator development, use two terminals:

```sh
npm run emulators
```

```sh
npm run dev:emulator
```

For reproducible table testing, with the emulators already running:

```sh
npm run seed:tables
```

This creates 23 local sample activities, 23 local registrations and an organiser account in `demo-greenmelbourne` only. The script fixes all endpoints to the local emulator ports and cannot write to production. Sign into the emulator website with `table-demo@example.test` / `LocalTables2026!` (disposable local credentials only). Re-running restores these sample records. Each table should have pages of 10, 10 and 3 rows.

Run just the table tests without emulators using `npm run test:tables`.

Emulator UI: http://127.0.0.1:4100. `.env.emulator` explicitly enables emulators; normal development uses the cloud configuration. Production builds reject emulator configurations and missing Firebase settings.

## Build and deployment

```sh
npm run build
firebase login
npm run deploy
```

Deployment publishes only this dedicated Hosting site and the Firestore rules. The database was created for this project during day-one setup; deploying a new ruleset affects the default database, so preserve any additional collection rules if future coursework shares it.

## Manual acceptance checklist

- Register a member, sign out, sign in again and reload: the signed-in session should remain.
- Open an activity deep link directly and submit an interest registration while signed in.
- Reload or use another signed-in browser: the same registration should be visible to its owner.
- Sign in as a different member: other members' registrations must remain private.
- Submit a rating, reload, then update it: one rating per activity/member should remain and the average should update.
- As an organiser, reload `/organiser`, inspect registrations and update their status.
- As a member or guest, visit `/organiser`: redirect to account access and deny protected database operations.
- Check a narrow viewport and keyboard navigation on login and registration forms.

GitHub repository access for the tutor must be checked separately in GitHub settings. No GitHub invitation is sent by this application.

## Day two manual acceptance checklist

1. Log in as an organiser and open `/organiser`: both Activities and Registrations appear.
2. Click a column heading twice: ascending then descending. Check Places sorts numbers and Date sorts chronologically.
3. Search the Suburb column in Activities; combine it with a Type filter and global search. Verify every returned row satisfies all active filters.
4. Search Registrations by Email, then by Status. The Activities filters and page should remain unchanged.
5. Clear filters: all records return and pagination resets to page one. A nonexistent term should show a no-matches message and disabled page buttons.
6. With more than 10 records, move through pages; never more than 10 data rows are visible. The hosted Activities table has 30 records and 3 full pages. The local sample dataset has 23 records and 3 pages, with 3 rows on the last page.
7. While filtering for Waiting, change a matching registration to Contacted. It should leave that filtered result, with a saved confirmation. Clear the filter and reload to confirm persistence.
8. On a narrow screen, scroll the table horizontally to reach all columns; the page itself should not become wider because of the table.

Day-two verification: production build and 8 table tests passed. Local browser checks with both 23-record tables covered 10/10/3 pagination, independent filters, numeric sort, combined column/global search, no-results state, clear filters, and persisted status changes. Production data and security rules were not modified by these tests.
