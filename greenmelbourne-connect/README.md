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

This is the first-day foundation for the Credit target. The two fully interactive tables, attachment email/cloud function, and map features are not implemented yet.

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

The old Local Storage accounts are not Firebase accounts: users must register once with Firebase. Old browser data is left intact but no longer used for authentication, shared registrations or ratings. It is not automatically uploaded or trusted as proof of ownership. Password hashes are not migrated. The three existing sample activities have been seeded in Firestore, with dates moved to October 2026 for the demonstration; source seed data is in `scripts/data/events.json`.

## Local emulators and automated checks

Requires Java 21+ and Firebase CLI. Tests use only project `demo-greenmelbourne`; they clear this disposable emulator database. Do not point tests at production.

```sh
npm test
```

This starts Auth on 9199 and Firestore on 8188, runs 8 security-rule tests and 1 Firebase SDK authentication integration test, then stops the emulators. Permission-denied output is expected for explicitly rejected operations.

For interactive emulator development, use two terminals:

```sh
npm run emulators
```

```sh
npm run dev:emulator
```

Emulator UI: http://127.0.0.1:4100. It starts with empty data; import the sample activities or add them via the emulator UI. `.env.emulator` explicitly enables emulators; normal development uses the cloud configuration. Production builds reject emulator configurations and missing Firebase settings.

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
