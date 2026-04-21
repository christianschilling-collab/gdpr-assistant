# Firestore Rules Setup für Templates & Training

## 📋 Übersicht

Um Templates und das Training-Modul in der App verwenden zu können, müssen die Firestore Security Rules angepasst werden. Diese Anleitung zeigt dir Schritt für Schritt, was zu tun ist.

## ✅ Benötigte Collections

### Für Templates:
1. **`templates`** - Response Templates (Haupt-Collection)
2. **`templateVersions`** - Version History für Templates

### Für Training:
3. **`trainingRequests`** - Training-E-Mails, die an Agenten gesendet wurden
4. **`trainingCategories`** - Training-Kategorien (die 8 Fehler-Kategorien)
5. **`agentProgress`** - Fortschritt der Agenten (welche Kategorien abgeschlossen)
6. **`trainingCompletions`** - Detaillierte Abschluss-Records
7. **`quizzes`** - Quiz-Fragen für Training-Kategorien
8. **`quizAttempts`** - Quiz-Versuche der Agenten
9. **`quizCertificates`** - Zertifikate für bestandene Quizzes
10. **`trainingTemplates`** - Vordefinierte Training-Templates (z.B. "New Agent Onboarding")
11. **`trainingFeedback`** - Feedback zu Trainings

## 🔧 Schritt-für-Schritt Anleitung

### Schritt 1: Firebase Console öffnen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Wähle dein Projekt aus
3. Klicke auf **"Firestore Database"** im linken Menü
4. Klicke auf den Tab **"Rules"**

### Schritt 2: Aktuelle Rules ansehen

Die aktuellen Rules sollten so aussehen (oder ähnlich):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deine bestehenden Rules...
  }
}
```

### Schritt 3: Rules für Templates & Training hinzufügen

**WICHTIG:** Füge die neuen Rules **INNERHALB** des `match /databases/{database}/documents { }` Blocks hinzu, **NACH** deinen bestehenden Rules.

Füge diese Rules hinzu:

```javascript
// ============================================
// TEMPLATES
// ============================================

// Templates collection - Response templates
match /templates/{templateId} {
  allow read, write: if true; // Development: Open access
}

// Template versions collection - Track template version history
match /templateVersions/{versionId} {
  allow read: if true;
  allow create: if request.auth != null;
}

// ============================================
// TRAINING MODULE
// ============================================

// Training requests collection - Track training emails sent to agents
match /trainingRequests/{requestId} {
  allow read, write: if true; // Development: Open access
}

// Training categories collection - Manage training categories
match /trainingCategories/{categoryId} {
  allow read, write: if true; // Development: Open access
}

// Agent progress collection - Track training completion per agent
match /agentProgress/{agentId} {
  allow read: if true; // Allow read for analytics
  allow write: if request.auth != null && request.resource.data.agentId == request.auth.uid;
}

// Training completions collection - Detailed completion records
match /trainingCompletions/{completionId} {
  allow read: if true; // Allow read for analytics
  allow create: if request.auth != null && request.resource.data.agentId == request.auth.uid;
  allow update, delete: if request.auth != null; // Admin operations
}

// Quiz collections - Training quizzes
match /quizzes/{quizId} {
  allow read: if true; // Anyone can read quizzes (agents need to take them)
  allow write: if request.auth != null; // Only authenticated users can create/update (admins)
}

// Quiz attempts collection - Track quiz completions
match /quizAttempts/{attemptId} {
  allow read: if true; // Allow read for analytics
  allow create: if request.auth != null && request.resource.data.agentId == request.auth.uid;
  allow update, delete: if request.auth != null; // Admins can update/delete
}

// Quiz certificates collection - Certificates for passed quizzes
match /quizCertificates/{certId} {
  allow read: if true; // Anyone can read (for verification)
  allow create: if request.auth != null && request.resource.data.agentId == request.auth.uid;
  allow update, delete: if request.auth != null; // Admins can update/delete
}

// Training templates collection - Pre-built and custom training templates
match /trainingTemplates/{templateId} {
  allow read: if true; // Anyone can read templates
  allow write: if request.auth != null; // Only authenticated users can create/update (admins)
}

// Training feedback collection
match /trainingFeedback/{feedbackId} {
  allow read: if true;
  allow create: if request.auth != null;
}
```

### Schritt 4: Vollständiges Beispiel

Wenn du die Rules komplett ersetzen möchtest (nur wenn du sicher bist!), kannst du die Datei `firestore-rules-development.txt` als Referenz verwenden.

**⚠️ WICHTIG:** Wenn du bereits andere Rules hast (z.B. für Quiz/Game), füge die Template-Rules **DAZU**, ersetze sie nicht!

### Schritt 5: Rules veröffentlichen

1. Klicke auf **"Publish"** (oben rechts)
2. Bestätige die Änderung
3. Warte ca. 1-2 Minuten, bis die Rules aktiv sind

## 🧪 Testen

Nach dem Veröffentlichen kannst du testen:

### Templates:
1. Öffne die App: `http://localhost:3000/templates`
2. Versuche ein Template zu erstellen oder zu bearbeiten
3. Prüfe die Browser-Konsole auf Fehler

### Training:
1. Öffne die App: `http://localhost:3000/training`
2. Versuche eine Training-Kategorie zu öffnen
3. Versuche Training an einen Agenten zu senden: `http://localhost:3000/training/send`
4. Prüfe die Browser-Konsole auf Fehler

## 📝 Development vs. Production Rules

### Development (aktuell):
```javascript
allow read, write: if true;  // Offen für alle
```

### Production (später):
```javascript
// Nur authentifizierte Benutzer
allow read: if request.auth != null;
allow write: if request.auth != null;
```

## ✅ Checkliste

### Setup:
- [ ] Firebase Console geöffnet
- [ ] Firestore Rules Tab geöffnet
- [ ] Template Rules hinzugefügt (`templates`, `templateVersions`)
- [ ] Training Rules hinzugefügt (alle 9 Collections)
- [ ] Rules veröffentlicht
- [ ] 1-2 Minuten gewartet

### Templates testen:
- [ ] App getestet (`/templates` Seite)
- [ ] Template erstellen/bearbeiten funktioniert
- [ ] Template Version History funktioniert

### Training testen:
- [ ] Training-Seite funktioniert (`/training`)
- [ ] Training-Kategorien werden angezeigt
- [ ] Training senden funktioniert (`/training/send`)
- [ ] Quiz-Seite funktioniert (`/training/[categoryId]/quiz`)
- [ ] Agent Progress wird gespeichert

## 🆘 Troubleshooting

### Fehler: "Missing or insufficient permissions"

**Lösung:** 
- Prüfe, ob die Rules korrekt veröffentlicht wurden
- Warte 1-2 Minuten und versuche es erneut
- Prüfe die Browser-Konsole für detaillierte Fehlermeldungen

### Fehler: "Collection not found"

**Lösung:**
- Die Collection wird automatisch erstellt, wenn das erste Dokument gespeichert wird
- Prüfe, ob die Rules korrekt sind (siehe oben)

### Rules werden nicht übernommen

**Lösung:**
- Prüfe, ob du auf "Publish" geklickt hast
- Warte 1-2 Minuten
- Hard Refresh im Browser (Cmd+Shift+R / Ctrl+Shift+R)

## 📚 Weitere Collections (für später)

Wenn du später weitere Features aktivieren möchtest, benötigst du auch:

- `cases` - Für Case Management
- `caseHistory` - Für Case Status History
- `caseActivity` - Für Case Activity Log
- `caseFeedback` - Für Case Feedback
- `marketPulseChecks` - Für Reporting
- `agentPerformance` - Für Agent Performance Dashboard

Die vollständigen Rules findest du in `firestore-rules-development.txt`.

## 💡 Nächste Schritte

Nach dem Setup der Rules:

### Templates:
1. ✅ Templates können erstellt werden
2. ✅ Templates können bearbeitet werden
3. ✅ Template Versioning funktioniert
4. ✅ Templates können in Cases verwendet werden

### Training:
1. ✅ Training-Kategorien können verwaltet werden
2. ✅ Training kann an Agenten gesendet werden
3. ✅ Agenten können Trainings abschließen
4. ✅ Quizzes können erstellt und absolviert werden
5. ✅ Zertifikate werden automatisch generiert
6. ✅ Training Analytics funktionieren

Dann kannst du:
- Templates über die UI erstellen/bearbeiten (`/templates`)
- Training-Kategorien verwalten (`/admin/training`)
- Training an Agenten senden (`/training/send`)
- Quizzes erstellen (`/admin/training/[id]/quiz`)
- Training Analytics ansehen (`/training/analytics`)
- Agent Profile ansehen (`/training/agent/[email]`)
