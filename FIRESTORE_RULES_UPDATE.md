# Firestore Rules Update - Workflows Collection hinzufügen

## Problem
Die `/workflows/demo` Seite zeigt "Missing or insufficient permissions" weil die `workflows` Collection nicht in den Firestore Rules definiert ist.

## Lösung

### Option 1: Manuell in Firebase Console (Schnellste Lösung - 2 Minuten)

1. Gehe zu: https://console.firebase.google.com/
2. Wähle dein Projekt: `gdpr-assistant-dach` (oder wie es heißt)
3. Links: **Firestore Database** → **Rules** Tab
4. Füge diese Zeile hinzu (ca. Zeile 220, nach `agentPerformance`):

```
    // ============================================
    // MULTI-STEP WORKFLOWS (NEW)
    // ============================================
    // Workflows collection - Multi-step workflow instances per case
    match /workflows/{workflowId} {
      allow read, write: if true;
    }
```

5. Click "Publish"

### Option 2: Firebase CLI Deploy (wenn CLI installiert ist)

```bash
# Firebase CLI installieren (falls nicht vorhanden)
npm install -g firebase-tools

# Login
firebase login

# Deploy nur Rules
firebase deploy --only firestore:rules
```

## Die komplette Rules-Datei

Ich habe bereits die vollständige `firestore.rules` Datei im Projekt-Root erstellt:
- Datei: `/Users/christian.schilling/gdpr-assistant-cursor/firestore.rules`
- Enthält die neue `workflows` Collection Rule

## Warum das passiert

Die Demo-Seite selbst greift **nicht** auf Firestore zu (verwendet nur lokale Workflow-Templates).

ABER: Die **Navigation** oder andere Komponenten könnten Firebase-Calls machen wenn:
- AuthContext versucht User-Daten zu laden
- Analytics beim Seitenaufruf Daten abfragen
- Layout-Komponenten auf Firestore zugreifen

## Temporäre Workaround (ohne Rules-Update)

Wenn du die Rules jetzt nicht updaten kannst, kannst du die Demo-Seite trotzdem nutzen:

1. **Ignoriere den Fehler** - Die Seite sollte trotzdem funktionieren (nur eine Console-Warnung)
2. **Oder:** Nutze die Backend-Tests stattdessen:
   ```bash
   npx tsx scripts/test-workflows.ts
   ```

## Nach dem Rules-Update

Die Demo-Seite sollte dann funktionieren und du siehst:
- ✅ 5 Workflow-Templates
- ✅ Details zu allen Steps
- ✅ Email-Templates mit Vorschau
- ✅ Keine Firebase-Fehler in der Console

## Nächste Schritte

1. **Jetzt:** Rules in Firebase Console updaten (2 Minuten)
2. **Dann:** Seite neu laden: http://localhost:3000/workflows/demo
3. **Testen:** Workflows durchklicken und Details anschauen
