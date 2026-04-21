# Deployment (Hosting)

Die App nutzt **Next.js API-Routes** unter `/api/*` (z. B. `sanitize-pii`, `classify-case`).  
Deshalb funktioniert **kein** reines **`output: 'export'`** + statischer Ordner `out/` mehr wie früher angedacht.

`npm run build` erzeugt eine **normale** Next-Produktion (`.next/`, dynamische Routen + APIs).

---

## Option A — **Vercel** (schnell, gut für Teilen)

1. Repo auf GitHub/GitLab pushen (ohne `.env.local`).
2. [vercel.com](https://vercel.com) → Projekt importieren.
3. **Environment Variables** setzen (wie in `.env.local.example`, inkl. `GEMINI_API_KEY`, alle `NEXT_PUBLIC_FIREBASE_*`; optional `FIREBASE_SERVICE_ACCOUNT` nur wenn du Server-Skripte auf Vercel brauchst).
4. Deploy → URL an Dritte weitergeben.
5. In Firebase **Authentication → Authorized domains** die Vercel-Domain eintragen.

---

## Option B — **Firebase App Hosting** (Google, Next.js mit Server)

Für volle Next-Funktion inkl. API-Routes auf Google-Infrastruktur:  
[Firebase App Hosting](https://firebase.google.com/docs/app-hosting) — in diesem Repo: **`apphosting.yaml`**, **`firebase.json`** → `apphosting` (Backend-ID **`gdpr-assistant`**).

**Voraussetzungen:** Projekt **Blaze**, Firebase CLI **≥ 14.4** (`firebase-tools` im Repo), einmalig Backend anlegen (ID muss zu `backendId` in `firebase.json` passen):

```bash
firebase login
firebase apphosting:backends:create --project team-cc-gdpr
# Backend-ID z. B. "gdpr-assistant" wählen (oder firebase.json anpassen).
```

Oder: **`firebase init apphosting`** und dieselben Einstellungen wählen (überschreibt/ergänzt `firebase.json` und `apphosting.yaml` — ggf. unsere `apphosting.yaml` danach vergleichen).

**Umgebungsvariablen** im Console-Pfad *App Hosting → Backend → Environment* (wie `.env.local.example`): `GEMINI_API_KEY`, alle `NEXT_PUBLIC_FIREBASE_*`, optional Server-Keys falls nötig. **Authentication → Authorized domains:** die App-Hosting-URL ergänzen.

**Deploy (Regeln + App):**

```bash
npm run deploy:firebase
```

Nur App-Hosting-Rollout:

```bash
npm run deploy:firebase:app
```

[Deploy aus lokaler Quelle](https://firebase.google.com/docs/app-hosting/alt-deploy) entspricht dem, was die CLI hier macht (Upload, Cloud Build, Cloud Run).

Klassisches Hosting mit **`"public": "out"`** ist aus **`firebase.json`** entfernt — mit `/api/*` nicht sinnvoll ohne API-Auslagerung.

---

## Option C — **Klassisches Firebase Hosting (`out/`)** (nur nach Umbau)

Nur möglich, wenn alle `/api/*`-Logik woanders liegt (z. B. **Cloud Functions Callable**) und das Frontend wieder **`output: 'export'`** bauen kann.

---

## Firestore / Auth (alle Optionen)

- Regeln: `firestore.rules` (bereits für `team-cc-gdpr` aus diesem Repo deploybar).
- **Niemals** `.env.local` oder Service-Account-JSON committen.
