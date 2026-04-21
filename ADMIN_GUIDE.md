# ⚙️ Admin Guide - Training Categories Management

## Overview

Das Admin-System erlaubt es, Training-Kategorien zu verwalten:
- ✅ Kategorien anzeigen
- ✅ Neue Kategorien erstellen
- ✅ Bestehende Kategorien bearbeiten
- ✅ Kategorien löschen

## Admin-Zugriff

### Passwort-basierte Authentifizierung

**Aktuell**: Einfaches Passwort-System (für Entwicklung)
- **Default Passwort**: `admin123`
- **Ändern**: Setze `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env.local`

**Für Production**: Später durch richtige Authentication ersetzen (z.B. Firebase Auth, NextAuth, etc.)

### Admin-Session

- Admin-Login wird in `sessionStorage` gespeichert
- Session bleibt während des Browser-Tabs aktiv
- "Logout" Button beendet die Session

## Admin-Bereiche

### 1. Admin Training Management (`/admin/training`)

**Features:**
- Liste aller Training-Kategorien
- Edit-Button für jede Kategorie
- Delete-Button für jede Kategorie
- "New Category" Button

**Zugriff:**
- Direkt: http://localhost:3001/admin/training
- Von Training-Seite: "Admin: Manage Categories" Button (nur sichtbar wenn eingeloggt)

### 2. Category Edit (`/admin/training/[id]/edit`)

**Features:**
- Alle Felder bearbeiten:
  - Title (required)
  - Description (required)
  - Correct Approach (required)
  - Common Mistakes (dynamisch hinzufügen/entfernen)
  - Examples (dynamisch hinzufügen/entfernen)
  - Resources (dynamisch hinzufügen/entfernen)

**Zugriff:**
- Von Admin-Seite: "Edit" Button
- Von Category Detail Page: "Edit" Button (nur sichtbar wenn Admin eingeloggt)

### 3. New Category (`/admin/training/new`)

**Features:**
- Gleiche Formular-Felder wie Edit
- Erstellt neue Kategorie in Firestore

## Daten-Speicherung

### Firestore Collection: `trainingCategories`

**Struktur:**
```typescript
{
  title: string;
  description: string;
  commonMistakes: string[];
  correctApproach: string;
  examples: Array<{ wrong: string; correct: string }>;
  resources?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Fallback zu Defaults

- Falls keine Kategorien in Firestore sind, werden die Default-Kategorien aus `lib/training/categories.ts` verwendet
- Beim Laden wird zuerst Firestore geprüft, dann Fallback zu Defaults

## Edit-Links auf Category Pages

**Sichtbarkeit:**
- "Edit" Button erscheint nur wenn Admin eingeloggt ist
- Prüft `sessionStorage.getItem('admin_authenticated')`

**Funktionalität:**
- Direkter Link zu `/admin/training/[id]/edit`
- Schneller Zugriff ohne durch Admin-Übersicht zu gehen

## Workflow

### Kategorie bearbeiten:

1. **Option A (von Category Page)**:
   - Gehe zu `/training/[categoryId]`
   - Klicke "Edit" Button (nur sichtbar wenn Admin)
   - Bearbeite die Kategorie
   - Klicke "Save Changes"

2. **Option B (von Admin Section)**:
   - Gehe zu `/admin/training`
   - Klicke "Edit" bei der gewünschten Kategorie
   - Bearbeite die Kategorie
   - Klicke "Save Changes"

### Neue Kategorie erstellen:

1. Gehe zu `/admin/training`
2. Klicke "+ New Category"
3. Fülle alle Felder aus
4. Klicke "Create Category"

### Kategorie löschen:

1. Gehe zu `/admin/training`
2. Klicke "Delete" bei der gewünschten Kategorie
3. Bestätige die Löschung

## Security Notes

⚠️ **Aktuell**: Einfaches Passwort-System für Entwicklung

**Für Production empfohlen:**
- Firebase Authentication
- NextAuth.js
- Role-based Access Control (RBAC)
- Proper session management

## Environment Variables

Füge zu `.env.local` hinzu (optional):

```env
NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password-here
```

Falls nicht gesetzt, wird `admin123` als Default verwendet.

---

**URLs:**
- Admin Login: Automatisch bei `/admin/training`
- Admin Overview: http://localhost:3001/admin/training
- New Category: http://localhost:3001/admin/training/new
- Edit Category: http://localhost:3001/admin/training/[id]/edit
