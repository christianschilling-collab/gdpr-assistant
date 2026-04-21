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
[Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (eigenes `apphosting.yaml`, anderes Deployment als klassisches `public: out`).

Die vorhandene **`firebase.json`** mit `"public": "out"` ist für **statischen Export** gedacht — mit der aktuellen App bitte **nicht** mehr so deployen, solange `/api/*` genutzt wird.

---

## Option C — **Klassisches Firebase Hosting (`out/`)** (nur nach Umbau)

Nur möglich, wenn alle `/api/*`-Logik woanders liegt (z. B. **Cloud Functions Callable**) und das Frontend wieder **`output: 'export'`** bauen kann.

---

## Firestore / Auth (alle Optionen)

- Regeln: `firestore.rules` (bereits für `team-cc-gdpr` aus diesem Repo deploybar).
- **Niemals** `.env.local` oder Service-Account-JSON committen.
