# 🔧 Firestore Security Rules - Fehlerbehebung

## Problem: "Missing or insufficient permissions"

Dieser Fehler tritt auf, wenn die **Firestore Security Rules** den Zugriff auf die Collections blockieren.

---

## ✅ Lösung: Firestore Rules in Firebase Console aktualisieren

### Schritt 1: Firebase Console öffnen

1. Gehe zu: https://console.firebase.google.com/
2. Wähle dein Projekt aus (z.B. `dach-ai-mvps`)

### Schritt 2: Firestore Rules öffnen

1. Im linken Menü: **Firestore Database** klicken
2. Oben im Tab-Menü: **Rules** Tab klicken
3. Du siehst jetzt den Rules-Editor

### Schritt 3: Aktuelle Rules prüfen

Die aktuellen Rules sehen wahrscheinlich so aus:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Nur Quiz/Game Rules vorhanden
    match /quizzes/{quizId} { ... }
    match /games/{gameId} { ... }
  }
}
```

**Problem:** Es fehlen Rules für die neuen Collections (`cases`, `templates`, `trainingRequests`, etc.)

### Schritt 4: Rules erweitern

**WICHTIG:** Füge die neuen Rules **HINZU**, ohne die bestehenden zu löschen!

Kopiere die folgenden Rules und füge sie **innerhalb** des `match /databases/{database}/documents { }` Blocks hinzu:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // BESTEHENDE RULES (NICHT LÖSCHEN!)
    // ============================================
    match /quizzes/{quizId} {
      allow get: if true;
      allow list: if request.auth != null && (resource.data.createdBy == request.auth.uid || resource.data.privacy == 'public');
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid && request.resource.data.privacy in ['public', 'private'];
      allow update: if request.auth != null && ( resource.data.createdBy == request.auth.uid || (resource.data.privacy == 'public' && request.resource.data.privacy == 'public') );
      allow delete: if request.auth != null && resource.data.createdBy == request.auth.uid;
    }
    
    match /games/{gameId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if true;
      allow delete: if request.auth != null;
    }
    
    // ============================================
    // NEUE RULES FÜR GDPR ASSISTANT (HINZUFÜGEN!)
    // ============================================
    
    // Cases collection
    match /cases/{caseId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Templates collection
    match /templates/{templateId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Training Requests
    match /trainingRequests/{requestId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Training Categories
    match /trainingCategories/{categoryId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Agent Progress
    match /agentProgress/{agentId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Training Completions
    match /trainingCompletions/{completionId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Quizzes
    match /quizzes/{quizId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Quiz Attempts
    match /quizAttempts/{attemptId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Quiz Certificates
    match /quizCertificates/{certificateId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Training Templates
    match /trainingTemplates/{templateId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Market Pulse Checks
    match /marketPulseChecks/{pulseId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Case History
    match /caseHistory/{historyId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Case Activity
    match /caseActivity/{activityId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Template Versions
    match /templateVersions/{versionId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Training Feedback
    match /trainingFeedback/{feedbackId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Case Feedback
    match /caseFeedback/{feedbackId} {
      allow read, write: if true; // Development: Open access
    }
    
    // Agent Performance
    match /agentPerformance/{performanceId} {
      allow read, write: if true; // Development: Open access
    }
  }
}
```

### Schritt 5: Rules speichern

1. Klicke auf **"Publish"** (oben rechts)
2. Bestätige die Änderung
3. Warte 10-30 Sekunden, bis die Rules aktiv sind

### Schritt 6: Testen

1. Gehe zurück zu deiner App
2. Lade die Seite neu
3. Der Fehler sollte verschwunden sein

---

## ⚠️ WICHTIG: Duplikate vermeiden!

**ACHTUNG:** Wenn du bereits Rules für `quizzes` hast, füge die neuen Rules **NUR** für die Collections hinzu, die noch nicht existieren!

**Prüfe vorher:**
- Gibt es schon `match /cases/{caseId}`? → Überspringen
- Gibt es schon `match /templates/{templateId}`? → Überspringen
- etc.

**Füge nur hinzu, was fehlt!**

---

## 🔒 Production Rules (später)

Für Production solltest du die Rules verschärfen:

```javascript
// Beispiel: Authentifizierte Benutzer nur
match /cases/{caseId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
  allow update: if request.auth != null;
  allow delete: if request.auth != null && resource.data.createdBy == request.auth.uid;
}
```

Aber für jetzt (Development) ist `allow read, write: if true;` in Ordnung.

---

## 📋 Checkliste

- [ ] Firebase Console geöffnet
- [ ] Firestore Database → Rules Tab
- [ ] Bestehende Rules gelesen
- [ ] Neue Rules hinzugefügt (ohne bestehende zu löschen)
- [ ] "Publish" geklickt
- [ ] 30 Sekunden gewartet
- [ ] App neu geladen
- [ ] Fehler behoben? ✅

---

## 🆘 Falls es immer noch nicht funktioniert

1. **Prüfe die Browser-Konsole** für detaillierte Fehlermeldungen
2. **Prüfe die Firebase Console** → Firestore → Rules → ob die Rules korrekt gespeichert sind
3. **Warte 1-2 Minuten** - Rules können etwas Zeit brauchen, um aktiv zu werden
4. **Prüfe die Collection-Namen** - müssen exakt übereinstimmen (Groß-/Kleinschreibung!)

---

## 📞 Support

Falls du weiterhin Probleme hast, teile mir mit:
- Welche Collections genau den Fehler verursachen
- Die aktuelle Fehlermeldung aus der Browser-Konsole
- Screenshot der Firestore Rules (falls möglich)
