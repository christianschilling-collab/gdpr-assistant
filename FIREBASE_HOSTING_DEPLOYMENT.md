# 🚀 Firebase Hosting Deployment Guide
## GDPR Assistant auf Firebase Hosting deployen (Shared Project - SAFE)

---

## ⚠️ WICHTIG: Shared Project Safety

Dieses Firebase-Projekt (`dach-ai-mvps`) ist ein **shared project**.
Die Konfiguration ist so eingestellt, dass Sie **NICHT** die Root-Domain oder andere Apps überschreiben!

**Ihre Domain:** `gdpr-assistant-dach.web.app`
**AI Trailblazers:** `ai-trailblazers-dach.web.app` (bleibt unberührt)

---

## 📋 Voraussetzungen

### 1. Firebase CLI installieren (falls noch nicht)

```bash
npm install -g firebase-tools
```

### 2. Firebase Login

```bash
firebase login
```

→ Melden Sie sich mit Ihrem @hellofresh.de Google Account an

---

## 🎯 Deployment Schritte

### Schritt 1: Site in Firebase Console erstellen

1. **Öffnen Sie:** https://console.firebase.google.com/
2. **Projekt:** `dach-ai-mvps`
3. **Navigation:** Hosting (linke Sidebar)
4. **Klicken Sie:** "Add another site" (oder "Website hinzufügen")
5. **Site ID eingeben:** `gdpr-assistant-dach`
6. **Bestätigen**

**Wichtig:** Die Site-ID MUSS `gdpr-assistant-dach` sein (wie in firebase.json definiert)!

---

### Schritt 2: Next.js App für Production builden

```bash
# Im Projekt-Verzeichnis:
npm run build

# Next.js static export (für Firebase Hosting):
npx next export
```

**Ergebnis:** Erstellt einen `out/` Ordner mit static files

---

### Schritt 3: Firebase Projekt auswählen

```bash
# Im Projekt-Verzeichnis:
firebase use dach-ai-mvps
```

Oder interaktiv auswählen:
```bash
firebase use
# Wählen Sie: dach-ai-mvps
```

---

### Schritt 4: Deployment (nur Hosting, NICHT Rules!)

```bash
# NUR Hosting deployen für gdpr-assistant-dach:
firebase deploy --only hosting:gdpr-assistant-dach
```

**⚠️ NICHT folgendes machen:**
```bash
# ❌ NICHT ohne --only (deployed alles!)
firebase deploy

# ❌ NICHT nur "hosting" (deployed alle Sites!)
firebase deploy --only hosting
```

**✅ IMMER mit Site-Spezifikation:**
```bash
firebase deploy --only hosting:gdpr-assistant-dach
```

---

### Schritt 5: Überprüfen

Nach erfolgreichem Deployment:

1. **Öffnen Sie:** https://gdpr-assistant-dach.web.app
2. **Erwartung:** Ihre GDPR App lädt
3. **Testen Sie:** Login mit @hellofresh.com Email
4. **Testen Sie:** Reporting-Seite

**Andere Sites prüfen (sollten unverändert sein):**
- https://ai-trailblazers-dach.web.app (sollte weiterhin funktionieren)
- https://dach-ai-mvps.web.app (root domain, sollte unverändert sein)

---

## 🔧 Next.js Konfiguration für Static Export

**Datei:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Wichtig für Firebase Hosting!
  images: {
    unoptimized: true  // Firebase Hosting braucht das
  },
  trailingSlash: false
}

module.exports = nextConfig
```

---

## 📁 .firebaserc Datei (automatisch erstellt)

Nach `firebase use` wird diese Datei erstellt:

```json
{
  "projects": {
    "default": "dach-ai-mvps"
  }
}
```

---

## 🛡️ Sicherheits-Checkliste

Vor dem Deployment prüfen:

- [ ] `firebase.json` hat `"site": "gdpr-assistant-dach"`
- [ ] Deploy-Command nutzt `--only hosting:gdpr-assistant-dach`
- [ ] Next.js Build war erfolgreich (`out/` Ordner existiert)
- [ ] Firebase CLI ist eingeloggt mit richtigem Account
- [ ] Site `gdpr-assistant-dach` existiert in Firebase Console

**Bei Unsicherheit:**
```bash
# Zeigt Preview ohne zu deployen:
firebase hosting:channel:deploy preview --only hosting:gdpr-assistant-dach
```

---

## 🔄 Updates deployen

**Workflow für zukünftige Updates:**

```bash
# 1. Code ändern
# 2. Builden
npm run build

# 3. Static Export
npx next export

# 4. Deployen (nur Ihre Site!)
firebase deploy --only hosting:gdpr-assistant-dach
```

---

## 🐛 Troubleshooting

### Problem: "Site not found"

**Lösung:** Site in Firebase Console erstellen (Schritt 1)

### Problem: "Multiple sites found"

**Lösung:** Immer `--only hosting:gdpr-assistant-dach` verwenden (nicht nur `--only hosting`)

### Problem: "Next.js app doesn't load"

**Lösung:** 
1. Check `next.config.js` hat `output: 'export'`
2. Check `out/` Ordner existiert
3. Check `firebase.json` zeigt auf `"public": "out"`

### Problem: "AI Trailblazers is down after deployment"

**Ursache:** Sie haben versehentlich die root domain überschrieben

**Lösung:**
1. SOFORT kontaktieren Sie das AI Trailblazers Team
2. Rollback in Firebase Console: Hosting → Deployment History → Previous deployment → "Restore"

---

## ✅ Nach dem Deployment

**Testing Checklist:**

1. [ ] GDPR App lädt auf `gdpr-assistant-dach.web.app`
2. [ ] Login funktioniert
3. [ ] Reports werden angezeigt
4. [ ] AI Trailblazers funktioniert noch (Kontrolle)
5. [ ] Keine Console Errors im Browser

---

## 📞 Support

Bei Problemen kontaktieren Sie:
- **Christian Schilling:** christian.schilling@hellofresh.de
- **Firebase Support:** https://firebase.google.com/support

---

**Viel Erfolg beim Deployment! 🚀**
