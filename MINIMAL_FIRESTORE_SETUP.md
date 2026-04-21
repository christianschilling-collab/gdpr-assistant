# 🔧 Minimal Firestore Setup - Templates & Cases

## 📋 Ziel

**Minimalste Änderung**, um mit **Templates** und **Case-Klassifizierung** zu starten.

## ✅ Benötigte Collections (nur 2!)

1. **`templates`** - Response Templates (für Template-Matching bei Cases)
2. **`cases`** - GDPR Cases (für Case-Management)

Das war's! Alles andere kann später hinzugefügt werden.

---

## 🔧 Schritt-für-Schritt (5 Minuten)

### Schritt 1: Firebase Console öffnen

1. Gehe zu: https://console.firebase.google.com/
2. Wähle dein Projekt aus
3. Klicke auf **"Firestore Database"** im linken Menü
4. Klicke auf den Tab **"Rules"**

### Schritt 2: Aktuelle Rules ansehen

Du siehst wahrscheinlich etwas wie:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bestehende Rules (z.B. für Quiz/Game)
    match /quizzes/{quizId} { ... }
    match /games/{gameId} { ... }
  }
}
```

### Schritt 3: Nur 2 Rules hinzufügen

**WICHTIG:** Füge diese Rules **INNERHALB** des `match /databases/{database}/documents { }` Blocks hinzu, **NACH** deinen bestehenden Rules.

```javascript
// Cases collection - GDPR case management
match /cases/{caseId} {
  allow read, write: if true; // Development: Open access
}

// Templates collection - Response templates
match /templates/{templateId} {
  allow read, write: if true; // Development: Open access
}
```

### Schritt 4: Rules veröffentlichen

1. Klicke auf **"Publish"** (oben rechts)
2. Bestätige die Änderung
3. Warte 1-2 Minuten

### Schritt 5: Testen

1. Öffne: `http://localhost:3000/templates`
2. Versuche ein Template zu erstellen
3. Öffne: `http://localhost:3000/cases/new`
4. Erstelle einen Case und klicke auf "Process with AI"

---

## ✅ Vollständiges Beispiel

Wenn du die Rules komplett sehen willst, sollte es so aussehen:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // BESTEHENDE RULES (NICHT LÖSCHEN!)
    // ============================================
    match /quizzes/{quizId} {
      // Deine bestehenden Quiz Rules...
    }
    
    match /games/{gameId} {
      // Deine bestehenden Game Rules...
    }
    
    // ============================================
    // NEUE RULES (NUR DIESE 2 HINZUFÜGEN!)
    // ============================================
    
    // Cases collection - GDPR case management
    match /cases/{caseId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Templates collection - Response templates
    match /templates/{templateId} {
      allow read, write: if true; // Development: Open access
    }
  }
}
```

---

## 🧪 Was funktioniert danach?

✅ **Templates:**
- Templates erstellen/bearbeiten (`/templates`)
- Templates in der Liste ansehen
- Template-Matching bei Cases

✅ **Cases:**
- Cases erstellen (`/cases/new`)
- Cases ansehen (`/cases/[id]`)
- AI-Klassifizierung ("Process with AI")
- Template-Matching basierend auf Klassifizierung

---

## 📝 Checkliste

- [ ] Firebase Console geöffnet
- [ ] Firestore Rules Tab geöffnet
- [ ] `cases` Rule hinzugefügt
- [ ] `templates` Rule hinzugefügt
- [ ] Rules veröffentlicht
- [ ] 1-2 Minuten gewartet
- [ ] Templates-Seite getestet
- [ ] Case erstellen getestet
- [ ] AI-Klassifizierung getestet

---

## 🆘 Troubleshooting

### Fehler: "Missing or insufficient permissions"

**Lösung:**
- Prüfe, ob die Rules veröffentlicht wurden
- Warte 1-2 Minuten
- Hard Refresh im Browser (Cmd+Shift+R)

### Collection wird nicht erstellt

**Lösung:**
- Die Collection wird automatisch erstellt, wenn das erste Dokument gespeichert wird
- Prüfe die Browser-Konsole für Fehler

---

## 💡 Später hinzufügen (optional)

Wenn du später mehr Features brauchst, kannst du diese Collections hinzufügen:

- `templateVersions` - Template Version History
- `trainingCategories` - Training Module
- `trainingRequests` - Training senden
- etc.

Aber für jetzt reichen `cases` und `templates` völlig aus!

---

## 🎯 Zusammenfassung

**Minimal Setup = 2 Collections:**
1. `cases` - für Case-Management
2. `templates` - für Template-Matching

**Das war's!** Du kannst jetzt sofort loslegen. 🚀
