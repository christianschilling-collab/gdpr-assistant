# GDPR Assistant on Firebase `team-cc-gdpr`

This repo is configured for the **same Firebase project** as the AI Enablement dashboard (`/Users/christian.schilling/ai-enablement-dashboard`). Firestore rules in **`firestore.rules`** cover **both** apps and must stay **identical** to `ai-enablement-dashboard/firestore.rules` (edit one, copy to the other, then deploy once).

## What was changed in this repo

- **`.firebaserc`** — default project `team-cc-gdpr`
- **`firebase.json`** — **App Hosting** backend **`gdpr-assistant`** (`rootDir: "."`), Firestore rules + indexes; kein statisches `hosting.public: out` mehr
- **`firestore.rules`** — AI Trailblazers (`aitrailblazers_*`, legacy `dashboard`) + GDPR collections + default deny
- **`.env.local.example`** — points at `team-cc-gdpr` (fill from Firebase Console)

## Your checklist (Phase 1–2, no data migration)

### 1. Firebase Console (`team-cc-gdpr`)

1. **Firestore** — enabled (region per your org, e.g. `europe-west3`).
2. **Authentication** — Google sign-in enabled; **Authorized domains** include `localhost` and your hosting domain.
3. **Web app** — copy config into **`.env.local`** (`NEXT_PUBLIC_FIREBASE_*`). Restart `npm run dev`.

### 2. Firestore rules and indexes

From this directory:

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project team-cc-gdpr
```

Or paste **`firestore.rules`** into Console → Firestore → Rules → Publish, then deploy indexes from **`firestore.indexes.json`** (Console or CLI).

**Security note:** Rules currently reuse the Enablement helpers where `isAuthenticated()` is effectively **permissive (dev)**. Tighten to `request.auth != null` in both repos when you are ready for production.

### 3. Hosting (wichtig)

Die App hat **API-Routes** (`/api/*`). **Statisches** Firebase-Hosting (`out/` + `output: 'export'`) passt dazu nicht mehr.

Siehe **`DEPLOY.md`**: z. B. **Vercel** oder **Firebase App Hosting**.  
Die alte Kombination `npm run build` → Ordner `out/` → `firebase deploy --only hosting` ist nur wieder sinnvoll, wenn die APIs ausgelagert sind.

### 4. Optional seed / admin

Use existing scripts (`npm run init-data`, admin flows) as needed. No pilot data import (per your choice).

## Collection overlap

- GDPR uses top-level **`clusters`** / `clusters/{id}/teams/{teamId}` for its own org model.
- AI Enablement uses **`aitrailblazers_clusters`**. These names do **not** collide.

## References

- AI Enablement setup: `NEW_PROJECT_SETUP.md`, `SETUP_FIREBASE_STEPS.md`, `FIREBASE_DEPLOYMENT_GUIDE.md` in `ai-enablement-dashboard`.
- Local Firebase helper: `npm run configure:firebase` in this repo.
