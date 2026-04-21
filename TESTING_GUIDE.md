# Workflow Testing Guide

## 🚀 Schnellstart

### 1. Backend Tests
```bash
cd /Users/christian.schilling/gdpr-assistant-cursor
npx tsx scripts/test-workflows.ts
```

**Erwartetes Ergebnis:**
- ✅ 5 Workflow-Templates geladen
- ✅ Alle Steps korrekt definiert
- ✅ Email-Templates vorhanden

### 2. Dev Server starten
```bash
npm run dev
```

Server läuft auf: http://localhost:3000

### 3. Demo-Seite öffnen
**URL:** http://localhost:3000/workflows/demo

Diese Seite zeigt:
- Alle verfügbaren Workflow-Templates
- Details zu jedem Workflow (Steps, Email-Templates, Checklists)
- Test-Anweisungen

---

## 📝 Test-Szenarien

### Szenario 1: Datenauskunftsanfrage (Data Access Request)

**Ziel:** Teste den kompletten 6-Step-Workflow

**Schritte:**

1. **Case erstellen**
   - URL: http://localhost:3000/cases/new
   - Market: DE
   - Category: Datenauskunft
   - Description: "Kunde möchte Auskunft über gespeicherte Daten"
   - Submit

2. **Workflow initialisieren** (TODO: Button muss in UI hinzugefügt werden)
   ```typescript
   // Im Case-Detail: Button "Initialize Workflow"
   await initializeWorkflow(caseId, 'data_access');
   ```

3. **Step 1: Acknowledgement Email**
   - Click "Generate Email Draft"
   - Email sollte enthalten: "Sehr geehrte Damen und Herren...", Case-ID, "30 Tage"
   - Edit email if needed
   - Click "Mark as Completed"
   - **Erwartung:** Workflow auto-advances zu Step 2

4. **Step 2: Identitätsprüfung (Decision)**
   - Prüfe: Kundennummer vorhanden?
   - Wenn ja: Skip Step 3
   - Wenn nein: Complete Step 2, generiere ID-Request-Email in Step 3

5. **Step 3: ID-Request Email** (conditional)
   - Nur wenn Identität unklar
   - Generate Email: "Bitte senden Sie uns folgende Informationen..."
   - Complete Step

6. **Step 4: Daten sammeln (Manual)**
   - Checklist abarbeiten:
     - [x] OWL: Kundendaten exportieren
     - [x] MineOS: Bestellhistorie
     - [x] Jira: Support-Tickets
     - [x] Daten in PDF
   - Complete Step

7. **Step 5: Datenpaket versenden**
   - Generate Email: "Anbei erhalten Sie..."
   - Attach PDF (optional)
   - Complete Step

8. **Step 6: Fall abschließen**
   - Case-Status → Resolved
   - Jira Aktennotiz erstellen
   - Complete Step
   - **Erwartung:** Workflow ist completed

---

### Szenario 2: Werbewiderruf (Marketing Opt-Out)

**Ziel:** Teste 4-Step-Workflow mit schnellerem Durchlauf

**Schritte:**

1. **Case erstellen**
   - Category: Werbewiderruf
   - Description: "Kunde möchte keine Marketing-Emails mehr"

2. **Workflow initialisieren**
   ```typescript
   await initializeWorkflow(caseId, 'marketing_opt_out');
   ```

3. **Step 1: Acknowledgement**
   - Generate & Complete

4. **Step 2: Opt-Out durchführen**
   - Checklist:
     - [x] OWL: Marketing-Flag deaktivieren
     - [x] Newsletter-System austragen
     - [x] Marketing-Automation pausieren
   - Complete

5. **Step 3: Bestätigung senden**
   - Generate Email: "Wir bestätigen die Abmeldung..."
   - Complete

6. **Step 4: Fall abschließen**
   - Complete
   - **Erwartung:** Workflow completed

---

### Szenario 3: Skip-Funktionalität testen

**Ziel:** Teste das Überspringen von Steps

1. Starte Datenauskunfts-Workflow
2. Bei Step 3 (ID-Request):
   - Click "Skip Step"
   - Reason: "Identität bereits verifiziert via Kundennummer"
   - Confirm
   - **Erwartung:** Step 3 status = 'skipped', Workflow geht zu Step 4

---

### Szenario 4: SLA-Violations testen

**Ziel:** Teste SLA-Monitoring

1. **Manuell Step überfällig machen** (für Entwicklung):
   ```typescript
   // In Firestore: Step startedAt auf 5 Tage zurück setzen
   // Oder: Warte 24h nachdem Email-Step gestartet wurde
   ```

2. **Analytics prüfen**
   - URL: http://localhost:3000/analytics/workflows
   - **Erwartung:** 
     - SLA Violations > 0
     - Stuck Points zeigt überfällige Steps
     - Case-ID wird angezeigt

---

### Szenario 5: Email-Generierung testen

**Voraussetzung:** `GEMINI_API_KEY` in `.env.local` gesetzt

**Test verschiedene Markets:**

1. **DE (Deutschland)**
   - Greeting: "Sehr geehrte Damen und Herren"
   - Closing: "Mit freundlichen Grüßen"
   
2. **AT (Österreich)**
   - Gleich wie DE
   
3. **CH (Schweiz)**
   - Greeting: "Sehr geehrte Damen und Herren"
   - Closing: "Freundliche Grüsse" (ohne 'ü')

**Prüfe:**
- Case-ID korrekt eingefügt
- Market-spezifische Formulierungen
- DSGVO-Referenzen (Art. 12 Abs. 3)
- Korrekte Tonalität (formal, höflich)

---

## 🐛 Häufige Probleme & Lösungen

### Problem: "Firebase is not configured"
**Lösung:** 
```bash
# Prüfe .env.local
cat .env.local | grep FIREBASE
```
Falls leer: Firebase-Konfiguration aus Firebase Console kopieren

### Problem: Email-Generierung schlägt fehl
**Lösung:**
```bash
# Prüfe Gemini API Key
cat .env.local | grep GEMINI_API_KEY
```
Falls leer: API-Key von https://aistudio.google.com/app/apikey

### Problem: Workflow wird nicht initialisiert
**Lösung:**
- Prüfe Firestore Rules (workflows collection muss beschreibbar sein)
- Check Browser Console für Fehler
- Verify template exists: `getWorkflowTemplate('data_access')`

### Problem: Auto-Advance funktioniert nicht
**Lösung:**
- Prüfe ob `autoAdvanceWorkflow()` nach `updateStepStatus()` aufgerufen wird
- Check `currentStepIndex` in Firestore
- Verify nächster Step existiert

---

## ✅ Checkliste: Was muss funktionieren?

### Backend
- [x] Standard-Workflows laden
- [x] Workflow-Template abrufen
- [x] Email-Templates definiert
- [x] Firestore CRUD-Funktionen
- [x] Automation-Logik

### Frontend
- [x] Demo-Seite zeigt alle Workflows
- [ ] Case-Detail mit Workflow-UI (WorkflowTimeline, CurrentStepCard, History)
- [ ] "Initialize Workflow" Button im Case-Detail
- [ ] Email-Editor (ReactQuill) funktioniert
- [ ] Step-Completion funktioniert
- [ ] Skip-Dialog funktioniert

### Integration
- [ ] Workflow wird bei Case-Erstellung automatisch initialisiert (optional)
- [ ] Email-Generierung funktioniert (mit API-Key)
- [ ] Auto-Advance nach Step-Completion
- [ ] SLA-Monitoring zeigt überfällige Steps
- [ ] Analytics-Dashboard zeigt Metriken

### Edge Cases
- [ ] Workflow ohne Email-Steps funktioniert
- [ ] Skip von optionalen Steps funktioniert
- [ ] Required Steps können nicht geskippt werden
- [ ] Backwards Compatibility: Alte Cases ohne Workflow funktionieren
- [ ] Workflow-History zeigt alle completed Steps

---

## 📊 Erwartete Metriken (nach Tests)

Nach Durchführung aller Test-Szenarien sollte Analytics zeigen:

- **Total Workflows:** 3+ (abhängig von Tests)
- **Completed Workflows:** 2+ 
- **Average Completion Time:** ~0.1 days (da Test-Steps schnell completed)
- **Step Performance:**
  - Acknowledgement Email: ~1 min avg
  - Manual Steps: ~2-5 min avg
  - Decision Steps: ~1 min avg
- **SLA Violations:** 0 (bei normaler Test-Durchführung)
- **Stuck Points:** 0

---

## 🔄 Next Steps nach Testing

1. **Bug Fixes:** Dokumentiere alle gefundenen Bugs
2. **UI-Verbesserungen:** Feedback zu UX sammeln
3. **Performance:** Prüfe Ladezeiten bei vielen Workflows
4. **Integration:** Workflow-Initialisierung automatisieren
5. **Training:** Dokumentation für Agents erstellen
6. **Rollout:** Schrittweise in Production deployen

---

## 📞 Support

Bei Problemen:
1. Check Browser Console für Fehler
2. Check `scripts/test-workflows.ts` Output
3. Verify Firebase & Gemini Configuration
4. Review `WORKFLOW_README.md` für Details

Happy Testing! 🚀
