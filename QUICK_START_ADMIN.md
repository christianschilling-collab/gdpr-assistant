# 🚀 Quick Start: Erste Schritte als Admin

## Problem gelöst! ✅

Die neue Logik ist jetzt:
1. **Nur User in Firestore dürfen sich anmelden**
2. **Keine automatische Profil-Erstellung**
3. **Du musst User manuell hinzufügen**

---

## 📋 SETUP SCHRITTE

### 1. Firestore Rules deployen
```
Firebase Console → Firestore Database → Rules
→ Kopiere aus firestore-rules-development.txt
→ Publish
```

### 2. Dich selbst als Admin hinzufügen

**Option A - Firebase Console (Empfohlen):**

1. Gehe zu **Firebase Console** (https://console.firebase.google.com/)
2. Öffne dein Projekt
3. **Firestore Database** → **Data**
4. Klicke **"Start collection"**
   - Collection ID: `users`
   - Document ID: `christian.schilling@hellofresh.de` (deine Email!)
   - Fields:
     ```
     email (string): christian.schilling@hellofresh.de
     role (string): admin
     isActive (boolean): true
     createdAt (timestamp): [Klick "Add field" → wähle "timestamp"]
     displayName (string): Christian Schilling (optional)
     ```
5. **Save**

**Option B - Via User Management UI (wenn du schon Admin bist):**
1. Gehe zu `http://localhost:3000/admin/users`
2. Klicke **"+ Add User"**
3. Trage ein:
   - Email: `neue.email@hellofresh.de`
   - Display Name: `Name des Users`
   - Role: `admin` oder `agent`
4. **Add User**

---

## 🧪 TESTEN

### Nach dem Hinzufügen deines Profils:

1. **Sign Out** (falls angemeldet)
2. **Reload** die Seite (F5)
3. **Sign In** mit Google
4. **Du solltest eingeloggt bleiben und Zugriff haben!**

### Konsole sollte zeigen:
```
✅ User profile loaded: { email: '...', role: 'admin', ... }
```

### Wenn User NICHT in Firestore:
```
⚠️ User not authorized: user@hellofresh.de
→ Automatischer Sign-Out
```

---

## 👥 NEUE USER HINZUFÜGEN

### Via User Management UI:

1. Gehe zu `/admin/users`
2. Klicke **"+ Add User"**
3. Trage ein:
   - **Email**: `agent@hellofresh.de`
   - **Display Name**: `Agent Name` (optional)
   - **Role**: `agent` oder `admin`
4. **Add User**

### Via Firebase Console:

1. Firestore Database → `users` collection
2. **Add document**
3. Document ID: Email des Users
4. Fields wie oben

---

## 🔒 ZUGRIFFSKONTROLLE

### Was passiert beim Login:

1. **User meldet sich mit Google an**
2. **AuthContext lädt User-Profil aus Firestore**
3. **Wenn User NICHT in `users` Collection:**
   - → Automatischer Sign-Out
   - → "User not authorized" in Konsole
   - → User bleibt auf Home-Page
4. **Wenn User gefunden:**
   - → Zugriff basierend auf `role` und `isActive`
   - → `lastLoginAt` wird aktualisiert

---

## 📊 USER ROLLEN

### Agent:
- Zugriff auf: Cases, Training, Help
- **KEIN** Zugriff auf: Templates, Analytics, Reporting, Admin

### Admin:
- **Voller Zugriff** auf alle Bereiche
- Kann User verwalten
- Kann Rollen ändern

---

## ⚠️ WICHTIG

1. **Erste Admin muss manuell in Firestore angelegt werden**
2. **Alle neuen User müssen vom Admin hinzugefügt werden**
3. **User können sich NICHT selbst registrieren**
4. **Unauthorized User werden automatisch ausgeloggt**
5. **Deaktivierte User (`isActive: false`) haben keinen Zugriff**

---

## 🛠️ TROUBLESHOOTING

### "User not authorized" trotz Eintrag in Firestore?

**Prüfe:**
1. Document ID = Email-Adresse (genau!)
2. `isActive` = `true`
3. Firestore Rules deployed
4. Hard Refresh (Cmd+Shift+R)

### Admin-Link nicht sichtbar?

**Prüfe:**
1. `role` = `"admin"` (als String!)
2. Email in ADMIN_EMAILS fallback (für den Übergang)
3. Browser-Konsole für Fehler

### User kann sich nicht anmelden?

**Prüfe:**
1. User existiert in `users` Collection
2. Document ID = exakte Email
3. `isActive` = `true`

---

## 🎯 NÄCHSTE SCHRITTE

1. ✅ Firestore Rules deployen
2. ✅ Dich selbst als Admin hinzufügen (Firebase Console)
3. ✅ Sign Out + Sign In
4. ✅ Zugriff testen (`/admin/users`)
5. ✅ Weitere User über UI hinzufügen

**Bereit!** 🚀
