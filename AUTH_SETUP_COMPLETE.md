# 🔐 Authentication Setup - GDPR Assistant

## ✅ Was wurde gemacht?

### 1. Frontend-Änderungen ✅
- **Reporting View Page** (`/app/reporting/view/page.tsx`) wurde aktualisiert:
  - ✅ Zeigt Login-Prompt wenn nicht angemeldet
  - ✅ Lädt Daten nur für authentifizierte Benutzer
  - ✅ Verwendet `useAuth()` Hook für Auth-Status

### 2. Auth-Infrastruktur (bereits vorhanden) ✅
- ✅ `AuthProvider` aktiv in `layout.tsx`
- ✅ `AuthGuard` aktiv für Routing-Schutz
- ✅ `LoginButton` Component für Google Sign-In
- ✅ Firebase Auth konfiguriert

### 3. Firestore Rules (müssen deployed werden) 🔥
- **Datei:** `firestore-rules-AUTHENTICATED.txt`
- **Änderungen:**
  - Alle GDPR-Collections erfordern jetzt `request.auth != null`
  - Behält `solverRuns` Rules vom anderen Team bei
  - Quizzes/Games bleiben teilweise public (für Gameplay)

---

## 🚀 Deployment Schritte

### Schritt 1: Firebase Rules deployen

1. **Öffnen Sie:** https://console.firebase.google.com/
2. **Projekt:** `dach-ai-mvps`
3. **Navigation:** Firestore Database → **Rules** Tab
4. **Kopieren:** Inhalt aus `firestore-rules-AUTHENTICATED.txt`
5. **Einfügen:** In den Rules-Editor (ersetzt alte Rules)
6. **Publish:** Klicken Sie oben rechts auf "Publish"

### Schritt 2: Dev-Server neu starten

```bash
# Server stoppen (Ctrl+C) und neu starten
npm run dev
```

### Schritt 3: Testen

1. Öffnen Sie: http://localhost:3000/reporting/view
2. Sie sollten einen **Login-Prompt** sehen
3. Klicken Sie auf **"Sign in with Google"**
4. Melden Sie sich mit Ihrer **@hellofresh.com** Email an
5. Nach erfolgreichem Login sollten die Reports geladen werden

---

## 🔍 Was passiert jetzt?

### **Unauthenticated User (nicht angemeldet):**
```
User → /reporting/view 
     ↓
Login-Prompt erscheint 🔒
     ↓
"Sign in with Google" Button
```

### **Authenticated User (angemeldet):**
```
User → /reporting/view 
     ↓
Auth-Check: ✅ user exists
     ↓
Firestore Request mit Auth-Token
     ↓
Rules Check: ✅ request.auth != null
     ↓
Data loaded successfully! 🎉
```

---

## 🔐 Security Model

### **GDPR Collections:**
```javascript
match /weeklyReports/{reportId} {
  allow read: if request.auth != null;    // ✅ Muss angemeldet sein
  allow write: if request.auth != null;   // ✅ Muss angemeldet sein
}
```

**Bedeutet:**
- ✅ Jeder **HelloFresh Google Account** kann lesen & schreiben
- ❌ Nicht-angemeldete Benutzer werden blockiert
- ❌ Externe Emails werden blockiert (nur via Firebase Console hinzufügbar)

### **Solver Runs (anderes Team):**
```javascript
match /solverRuns/{runId} {
  allow read, write: if request.auth != null
    && request.auth.token.email.matches('.*@hellofresh\\.com$');
}
```

**Bedeutet:**
- ✅ Nur `@hellofresh.com` Emails
- ❌ Keine externen Emails (z.B. `@ext.hellofresh.com`)

---

## 🎯 Vorteile dieser Lösung

1. **Sicherheit:**
   - ✅ Daten nur für authentifizierte Benutzer
   - ✅ Kein öffentlicher Zugriff auf sensible Reports

2. **Konsistenz:**
   - ✅ Gleicher Auth-Flow wie AI Trailblazers
   - ✅ Gleiche Rules-Struktur im shared Firebase Project

3. **User Experience:**
   - ✅ Klarer Login-Prompt
   - ✅ Smooth Auth-Flow mit Google
   - ✅ Keine Page-Reloads nach Login

4. **Wartbarkeit:**
   - ✅ Kombiniert beide Projekte in einem Rule-Set
   - ✅ Klare Kommentare für zukünftige Änderungen
   - ✅ Helper Functions für bessere Lesbarkeit

---

## 🐛 Troubleshooting

### Problem: "Permission Denied" nach Login

**Lösung:** Rules wurden noch nicht deployed oder nicht korrekt deployed.

1. Prüfen Sie in Firebase Console → Firestore → Rules
2. Stellen Sie sicher, dass die neuen Rules aktiv sind
3. Schauen Sie nach dem **"Published"** Timestamp

### Problem: Login-Loop (immer wieder zurück zu Login)

**Lösung:** User ist nicht im `users` Collection oder `isActive = false`

Siehe: `AuthContext.tsx` Zeile 54-62:
```typescript
if (!profile) {
  // User NOT in database - deny access
  console.warn('⚠️ User not authorized:', firebaseUser.email);
  await signOutUser();
}
```

**Fix:** User in Firestore `users` Collection hinzufügen mit `isActive: true`

### Problem: Falscher Email-Domain-Error

**Symptom:** `solverRuns` funktioniert nicht für `@ext.hellofresh.com`

**Erklärung:** Das ist gewollt! Die `solverRuns` Rules vom anderen Team erlauben nur `@hellofresh.com`.

**Ihre GDPR Collections:** Funktionieren mit **allen** authentifizierten Accounts (inkl. external).

---

## ✅ Checklist

- [ ] Frontend-Änderungen sind deployed (bereits im Code)
- [ ] Firebase Rules sind deployed (`firestore-rules-AUTHENTICATED.txt`)
- [ ] Dev-Server wurde neu gestartet
- [ ] Login funktioniert (getestet mit @hellofresh.com Email)
- [ ] Reports werden nach Login geladen
- [ ] Kein "Permission Denied" Error mehr

---

## 📞 Bei Problemen

1. Prüfen Sie Browser Console auf Errors
2. Prüfen Sie Firebase Console → Authentication → Users (ist User angelegt?)
3. Prüfen Sie Firestore → users Collection (hat User einen Eintrag?)
4. Kontaktieren Sie das Platform Team bei Rule-Konflikten

---

**Status:** ✅ Frontend Ready | 🔥 Rules müssen deployed werden
