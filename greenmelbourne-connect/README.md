# GreenMelbourne Connect

Vue 3 + Composition API application for a Melbourne environmental not-for-profit.

Live site: https://greenmelbourne-connect-801602918282.web.app

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

Attachment email/cloud functions and map features are still pending for the Credit target.

## Run against the cloud

Use Node.js 22 or later and install the Firebase CLI (`firebase-tools`).

```sh
npm ci
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

## Local emulators and automated checks

Requires Java 21+ and Firebase CLI. Tests use only project `demo-greenmelbourne`; they clear this disposable emulator database. Do not point tests at production.

```sh
npm test
```

This runs 8 table-behaviour tests, starts Auth on 9199 and Firestore on 8188, runs 8 security-rule tests and 1 Firebase SDK authentication integration test, then stops the emulators. Stop separately running emulators before this command. Permission-denied output is expected for explicitly rejected operations.

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
