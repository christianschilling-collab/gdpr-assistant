# 🚀 Workflow System - Quick Setup

## ⚠️ **WICHTIG: Firestore Rules müssen deployed werden!**

**Ohne Firestore Rules funktioniert:**
- ❌ Workflow Mappings speichern
- ❌ Workflow Mappings laden
- ❌ Auto-Workflow-Initialisierung (nutzt Firestore Fallback)
- ✅ Workflows anzeigen (bereits initialisierte)
- ✅ Workflow Steps durchlaufen
- ✅ Email Generation (mit Fallback)

---

## 🔥 **Firebase Rules Deploy (ERFORDERLICH)**

### Schritt 1: Firebase Console öffnen

```
https://console.firebase.google.com/project/dach-ai-mvps/firestore/rules
```

### Schritt 2: Rules hinzufügen

**Finde diese Section:**
```javascript
    // ============================================
    // MULTI-STEP WORKFLOWS (NEW)
    // ============================================
    // Workflows collection - Multi-step workflow instances per case
    match /workflows/{workflowId} {
      allow read, write: if true;
    }
```

**Füge DIREKT DARUNTER hinzu:**
```javascript
    
    // Workflow Mappings collection - Maps Case Type + Requester Type -> Workflow Template
    match /workflowMappings/{mappingId} {
      allow read, write: if true;
    }
```

### Schritt 3: Publish

1. Klicke **"Publish"** (oben rechts, grüner Button)
2. Warte 10-15 Sekunden
3. Verifiziere: Rules sollten "Published" Status haben

### Schritt 4: App testen

1. **Hard Refresh:** `Cmd+Shift+R` (Mac) oder `Ctrl+Shift+R` (Windows)
2. Test alle Funktionen (siehe unten)

---

## 🎯 **Was funktioniert JETZT (mit Fallback)?**

### ✅ **Auto-Workflow-Initialisierung**

**Hardcoded Mappings (funktionieren OHNE Firestore):**

| Category Name (enthält) | Workflow Template |
|-------------------------|-------------------|
| "Auskunft" / "Access" | `data_access` (6 Steps) |
| "Werbung" / "Marketing" | `marketing_opt_out` (4 Steps) |
| "Löschung" / "Deletion" | `data_deletion` (5 Steps) |
| "Übertragbar" / "Portability" | `data_portability` (5 Steps) |
| "Berichtigung" / "Correction" | `data_correction` (4 Steps) |

**Test:**
```
1. Neuen Case anlegen: http://localhost:3000/cases/new
2. Wähle Category die "Werbung" im Namen hat
3. Submit
4. Case wird automatisch mit "marketing_opt_out" Workflow erstellt!
```

**In Console siehst du:**
```
🔄 Checking for workflow mapping...
⚠️ Could not load from Firestore (Rules not deployed?), using defaults
  Category name: Werbewiderruf
✅ Workflow template determined: marketing_opt_out
🔄 Initializing workflow...
✅ Workflow initialized successfully!
```

---

### ✅ **Workflow Management UI**

```
http://localhost:3000/admin/workflows
```

**Funktioniert:**
- ✅ Zeigt Default-Mappings an (basierend auf Category-Namen)
- ✅ Dropdowns zum Ändern
- ✅ Edit-Buttons für Workflows

**Funktioniert NICHT ohne Rules:**
- ❌ "Save Mappings" speichert nicht → Alert kommt
- ❌ Gespeicherte Mappings werden nicht geladen

---

### ✅ **Workflow Templates**

```
http://localhost:3000/admin/workflows/list
```

**Alles funktioniert:**
- ✅ Alle Standard-Workflows anzeigen
- ✅ Filter
- ✅ Edit-Buttons
- ✅ Preview-Buttons

---

### ✅ **Workflow in Case**

**Wenn Workflow initialisiert ist:**
- ✅ Timeline anzeigen
- ✅ Current Step Card
- ✅ Generate Email (mit Fallback)
- ✅ Mark as Completed (Updates UI)
- ✅ Workflow History

---

## 📋 **Testing ohne Firestore Rules:**

### Test 1: Case mit Auto-Workflow erstellen ✅

```
1. http://localhost:3000/cases/new
2. Wähle:
   - Category: Irgendeine mit "Werbung" im Namen
   - Requester Type: Beliebig
   - Restliche Felder ausfüllen
3. Submit
4. Workflow sollte automatisch initialisiert sein!
5. In Console: "✅ Workflow initialized successfully!"
```

### Test 2: Workflow durchspielen ✅

```
1. Case mit Workflow öffnen
2. Generate Email → Funktioniert (Fallback auf statisches Template)
3. Mark as Completed → Progress Bar updated!
4. Nächster Step wird Current
5. Alle Steps durchspielen
```

### Test 3: Admin UI erkunden ✅

```
1. http://localhost:3000/admin/workflows
   - Siehst Default-Mappings
   - Edit-Buttons funktionieren

2. http://localhost:3000/admin/workflows/list
   - Siehst alle 5 Workflows
   - Edit/Preview funktioniert

3. http://localhost:3000/admin/workflows/edit/data_access
   - Siehst alle Steps
   - Read-Only Warning
```

---

## ❌ **Was NICHT funktioniert ohne Rules:**

1. **Workflow Mappings speichern**
   - Klick auf "Save Mappings" → Alert
   - Keine Persistierung in Firestore

2. **Custom Mappings laden**
   - Verwendet immer Hardcoded Fallback
   - Keine gespeicherten Mappings

3. **Approved Email Templates**
   - Matching funktioniert nicht (falsche IDs)
   - Fallback auf statische Templates funktioniert

---

## 🎯 **Deployment Checklist für Production:**

### Kritisch (vor Go-Live):
- [ ] **Firestore Rules deployen** (`workflows` + `workflowMappings`)
- [ ] **Workflow Mappings konfigurieren** (für alle Case Types)
- [ ] **Approved Email Templates** anlegen (mit korrekten IDs)
- [ ] **Gemini API Key** setzen (`.env.local`)

### Nice-to-have:
- [ ] Custom Workflows erstellen
- [ ] Email-Versand Integration
- [ ] SLA Monitoring
- [ ] Workflow Analytics

---

## 🚨 **Häufige Probleme:**

### Problem: "Save Mappings" funktioniert nicht

**Lösung:** Firestore Rules fehlen
```bash
→ Deploy Rules in Firebase Console
→ Section hinzufügen: workflowMappings
→ Publish klicken
```

### Problem: Workflow wird nicht automatisch initialisiert

**Debug:**
1. Console öffnen (F12)
2. Schaue nach: "🔄 Checking for workflow mapping..."
3. Falls "⚠️ Could not load from Firestore" → Rules fehlen
4. Falls "✅ Workflow template determined" aber kein Workflow → Check Category Namen

**Workaround:**
```
1. Case manuell erstellen
2. Case öffnen
3. "Initialize Workflow" Button klicken
4. Workflow auswählen
```

### Problem: "Generate Email" schlägt fehl

**Lösung:** Gemini API fehlt oder Templates falsch
```
→ Fallback auf statisches Template funktioniert
→ Email wird trotzdem generiert (mit Platzhaltern)
→ Für Production: Gemini API Key setzen
```

---

## ✅ **Was du JETZT testen kannst (ohne Rules):**

1. ✅ **Case mit Auto-Workflow erstellen**
2. ✅ **Workflow komplett durchspielen**
3. ✅ **Email Generation testen** (mit Fallback)
4. ✅ **Admin UI erkunden**
5. ✅ **Workflow Templates ansehen**

---

## 🚀 **Nächste Schritte:**

**Ohne Firestore Rules:**
→ Teste alle Workflows mit Hardcoded Mappings
→ Spiele verschiedene Cases durch
→ Prüfe ob alles funktional ist

**Mit Firestore Rules (empfohlen):**
→ Deploy Rules (2 Minuten)
→ Konfiguriere Custom Mappings
→ Teste persistente Speicherung

---

**Frage: Willst du die Rules JETZT deployen, oder erst ohne testen?** 🎯
