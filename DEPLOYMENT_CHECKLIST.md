# ✅ Deployment Checkliste - GDPR Assistant

## Phase 1: Firestore Rules (5 Minuten) 🔥

### Schritt 1.1: Datei öffnen
- [ ] Öffnen Sie: `firestore-rules-COMBINED-FINAL.txt`
- [ ] Kompletten Inhalt kopieren (Cmd+A, Cmd+C)

### Schritt 1.2: Firebase Console
- [ ] Öffnen: https://console.firebase.google.com/
- [ ] Projekt: `dach-ai-mvps`
- [ ] Navigation: Firestore Database → **Rules** Tab

### Schritt 1.3: Rules ersetzen
- [ ] Markieren Sie ALLE aktuellen Rules (aktuell 13 Zeilen)
- [ ] Löschen Sie die alten Rules
- [ ] Fügen Sie die neuen Rules ein (aus firestore-rules-COMBINED-FINAL.txt)
- [ ] **Publish** klicken (oben rechts)
- [ ] Bestätigung abwarten

### Schritt 1.4: Testen
- [ ] Öffnen: http://localhost:3000/reporting/view
- [ ] **Erwartung:** Login-Prompt erscheint
- [ ] Login mit @hellofresh.com Email
- [ ] **Erwartung:** Reports werden geladen! 🎉

**Falls Fehler:**
- Check Browser Console (F12)
- Check "Permission Denied" → Rules nochmal prüfen
- Warten Sie 10 Sekunden (Rules brauchen kurz)

---

## Phase 2: Firebase Hosting Vorbereitung (10 Minuten) 🚀

### Schritt 2.1: Firebase CLI
```bash
# Check ob installiert:
firebase --version

# Falls nicht installiert:
npm install -g firebase-tools

# Login:
firebase login
```

### Schritt 2.2: Site in Firebase Console erstellen
- [ ] Firebase Console: https://console.firebase.google.com/
- [ ] Projekt: `dach-ai-mvps`
- [ ] Navigation: **Hosting** (linke Sidebar)
- [ ] Button: **"Add another site"** (oder "Website hinzufügen")
- [ ] Site ID: `gdpr-assistant-dach` ← GENAU SO!
- [ ] **Create Site** klicken

### Schritt 2.3: Projekt konfigurieren
```bash
# Im gdpr-assistant-cursor Verzeichnis:
cd /Users/christian.schilling/gdpr-assistant-cursor

# Firebase Projekt setzen:
firebase use dach-ai-mvps

# Sollte zeigen: "Now using project dach-ai-mvps"
```

### Schritt 2.4: Build testen
```bash
# Next.js Build:
npm run build

# Static Export:
npx next export

# Check ob out/ Ordner existiert:
ls -la out/
```

**Expected Output:**
```
out/
  index.html
  _next/
  reporting/
  ... weitere Dateien
```

---

## Phase 3: Firebase Hosting Deployment (5 Minuten) 🌐

### Schritt 3.1: Deployment

```bash
# WICHTIG: Nur Ihre Site deployen!
firebase deploy --only hosting:gdpr-assistant-dach
```

**Watch for:**
```
✔  Deploy complete!

Hosting URL: https://gdpr-assistant-dach.web.app
```

### Schritt 3.2: Verification

**Ihre App testen:**
- [ ] Öffnen: https://gdpr-assistant-dach.web.app
- [ ] Login mit @hellofresh.com Email
- [ ] Reports Check: Gehen Sie zu /reporting/view
- [ ] Daten werden geladen

**Andere Apps prüfen (sollten unverändert sein):**
- [ ] https://ai-trailblazers-dach.web.app → Funktioniert noch?
- [ ] Root Domain unverändert

---

## ⚠️ Safety Checks (WICHTIG!)

### Vor dem Deployment:

**Check 1: firebase.json**
```bash
# Muss enthalten:
"site": "gdpr-assistant-dach"
```

**Check 2: Deploy Command**
```bash
# ✅ RICHTIG:
firebase deploy --only hosting:gdpr-assistant-dach

# ❌ FALSCH (deployed alles!):
firebase deploy
```

**Check 3: Site existiert**
- Firebase Console → Hosting → Sites
- `gdpr-assistant-dach` sollte in der Liste sein

---

## 🎯 Expected Results

### Nach Rules Deployment:
- ✅ Localhost: Login → Reports laden
- ✅ Keine "Permission Denied" Errors
- ✅ AI Trailblazers funktioniert noch

### Nach Hosting Deployment:
- ✅ https://gdpr-assistant-dach.web.app lädt
- ✅ Login funktioniert
- ✅ Reports funktionieren
- ✅ Alle anderen Sites unverändert

---

## 🐛 Troubleshooting

### Problem: "Permission Denied" nach Rules-Deploy

**Lösung:**
1. Warten Sie 30 Sekunden
2. Browser-Cache leeren (Cmd+Shift+R)
3. Neu einloggen
4. Rules in Firebase Console prüfen (richtig published?)

### Problem: "Site not found" beim Hosting

**Lösung:**
1. Check: Site in Firebase Console erstellt?
2. Site-ID muss EXAKT sein: `gdpr-assistant-dach`
3. `firebase use dach-ai-mvps` ausgeführt?

### Problem: Next.js Export Error

**Error:** "Image Optimization using Next.js' default loader..."

**Lösung:**
```javascript
// next.config.js muss haben:
images: {
  unoptimized: true
}
```

### Problem: Blank page nach Hosting

**Lösung:**
1. Check Browser Console (F12)
2. Check: `out/` folder hat Files?
3. Check: `npm run build` war erfolgreich?
4. Redeploy: `firebase deploy --only hosting:gdpr-assistant-dach`

---

## 📞 Notfall-Kontakte

### Wenn etwas schief geht:

1. **AI Trailblazers kaputt nach Deployment?**
   - Firebase Console → Hosting → Deployment History
   - Finden Sie "Previous deployment"
   - Klicken Sie "Restore"

2. **Rules verursachen Probleme?**
   - Firebase Console → Firestore → Rules
   - Klicken Sie auf vorherige Version in History
   - Restore previous rules

3. **Komplett neu starten:**
   ```bash
   # Rules zurücksetzen auf Original (13 Zeilen)
   # Site löschen in Firebase Console
   # Von vorne beginnen
   ```

---

## ✅ Success Criteria

**Sie sind fertig wenn:**
- [ ] Rules sind deployed
- [ ] Localhost funktioniert mit Login
- [ ] https://gdpr-assistant-dach.web.app funktioniert
- [ ] AI Trailblazers funktioniert noch
- [ ] Keine Console Errors

---

## 🎉 Nach erfolgreichem Deployment

**Optional - Team informieren:**

Email an Ihr Team / Platform Team:

```
Subject: New Firebase Hosting Site: GDPR Assistant

Hi team,

I've deployed a new site to our shared Firebase project (dach-ai-mvps):

Site: gdpr-assistant-dach.web.app
Purpose: GDPR Compliance Dashboard
Data: Test data only (no production customer data)

I've updated the Firestore Rules with clear comments and contact info.
The deployment is safe - no existing sites were affected.

If you have any questions or need stricter security rules,
please let me know!

Best,
Christian
```

---

**Bereit? Los geht's!** 🚀

**Estimated Time:**
- Rules: 5 Minuten
- Hosting Setup: 10 Minuten  
- Deployment: 5 Minuten
- **Total: ~20 Minuten**
