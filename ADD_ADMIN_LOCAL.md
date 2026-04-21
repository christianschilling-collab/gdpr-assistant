# 🚀 Quick Guide: Admin hinzufügen (Lokale Entwicklung)

## Aktueller Status: Lokale Entwicklung ohne Firestore Rules

Da wir ein **geteiltes Firebase-Projekt** nutzen, arbeiten wir lokal mit **hardcoded Admin-Emails**.

---

## ➕ NEUEN ADMIN HINZUFÜGEN

### **1. Diese 4 Dateien bearbeiten:**

#### **A. `components/Navigation.tsx`** (Zeile ~10-15)
```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
  'neue.email@hellofresh.de', // <-- Hier hinzufügen
];
```

#### **B. `components/AuthGuard.tsx`** (Zeile ~16-20)
```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
  'neue.email@hellofresh.de', // <-- Hier hinzufügen
];
```

#### **C. `app/admin/page.tsx`** (Zeile ~10-15)
```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
  'neue.email@hellofresh.de', // <-- Hier hinzufügen
];
```

#### **D. `app/admin/users/page.tsx`** (Zeile ~10-15)
```typescript
const ADMIN_EMAILS = [
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
  'neue.email@hellofresh.de', // <-- Hier hinzufügen
];
```

### **2. Speichern & Testen**
1. Dateien speichern
2. Neuer Admin meldet sich mit Google an
3. Sofortiger Admin-Zugriff! ✅

---

## 👁️ ADMIN LISTE ANSEHEN

`http://localhost:3000/admin/users`

**Zeigt:**
- Alle Admins aus ADMIN_EMAILS
- Status: "Active"
- Rolle: "Admin (Configured in code)"

---

## 📋 CURRENT ADMINS

```typescript
[
  'christian.schilling@hellofresh.com',
  'christian.schilling@ext.hellofresh.com',
  'christian.schilling@hellofresh.de',
]
```

---

## ⚠️ WICHTIG

- ✅ Funktioniert **lokal** ohne Firestore Rules
- ⏳ Für **Production** muss auf Firestore-basiertes User Management migriert werden
- 🔐 Admins müssen in **allen 4 Dateien** eingetragen werden
- 🚫 Keine Firestore Rules Änderungen nötig (vermeidet Konflikte mit anderen Teams)

---

## 🚀 MIGRATION ZU PRODUCTION

Wenn die App deployed wird:
1. Firestore Rules mit anderen Teams koordinieren
2. `users` Collection in Firestore anlegen
3. Migration von Code-based zu DB-based Admins
4. Siehe: `FIREBASE_SHARED_PROJECT.md`

---

## 🛠️ TROUBLESHOOTING

**Admin-Link nicht sichtbar?**
- Email in allen 4 Dateien eingetragen?
- Browser Hard-Refresh (Cmd+Shift+R)
- Console prüfen: `hasAdminAccess: true`?

**Admin-Zugriff funktioniert nicht?**
- Richtige Email verwendet?
- Typos in ADMIN_EMAILS?
- Sign Out + Sign In?
