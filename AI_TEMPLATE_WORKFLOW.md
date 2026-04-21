# 🤖 AI-gestützte Template-Erstellung - Workflow

## Überblick

Nutze AI (ChatGPT, Claude, etc.) um Templates aus deiner bestehenden Dokumentation zu erstellen und direkt zu importieren!

---

## 🚀 WORKFLOW

### **1. Dokumentation vorbereiten**

Kopiere deine bestehende Dokumentation (Confluence, Google Docs, etc.):
- Response-Text
- Prozessschritte
- Links zu weiterführender Dokumentation
- Jira-Vorlagen

### **2. AI-Prompt erstellen**

**Beispiel-Prompt für ChatGPT/Claude:**

```
Erstelle aus dieser Dokumentation ein GDPR-Template im folgenden JSON-Format:

{
  "name": "Template Name (z.B. 'Data Deletion Request - Customer')",
  "categoryId": "category-id (z.B. 'data-deletion', 'marketing-opt-out', etc.)",
  "requesterTypeId": "requester-type-id (z.B. 'customer', 'non-customer', 'employee')",
  "content": "Der Response-Text mit Variablen wie {{customerName}}, {{caseId}}, {{market}}, {{date}}, {{agentName}}",
  "processSteps": [
    {
      "title": "Schritt-Titel",
      "description": "Detaillierte Beschreibung des Schritts"
    }
  ],
  "confluenceLinks": [
    "https://hellofresh.atlassian.net/wiki/..."
  ],
  "jiraTemplate": "Text für Jira-Notizen oder Handover"
}

Hier ist die Dokumentation:

[DEINE DOKUMENTATION HIER EINFÜGEN]
```

### **3. JSON validieren & anpassen**

- ✅ Prüfe `categoryId` und `requesterTypeId` (siehe Listen unten)
- ✅ Ersetze Kundennamen mit `{{customerName}}`
- ✅ Füge weitere Variablen hinzu: `{{caseId}}`, `{{market}}`, `{{date}}`, `{{agentName}}`
- ✅ Teste JSON-Syntax (z.B. auf jsonlint.com)

### **4. Import in App**

1. Gehe zu `/templates/import`
2. Paste JSON
3. Klick "Parse JSON"
4. Review Preview
5. Klick "Import Template"
6. ✅ Fertig!

---

## 📋 VERFÜGBARE IDS

### **Category IDs** (aus deinem System):
```
data-deletion
data-portability
marketing-opt-out
complaint
breach
incident
access-request
correction-request
```

### **Requester Type IDs** (aus deinem System):
```
customer
non-customer
employee
applicant
funeral-home
unknown
```

---

## 💡 VERFÜGBARE VARIABLEN

Nutze diese Platzhalter in deinen Templates:

- `{{customerName}}` → Wird später durch Kundennamen ersetzt
- `{{caseId}}` → Case-Nummer (z.B. HELP-2026-123)
- `{{market}}` → Market (DACH, Nordics, BNL, France)
- `{{date}}` → Aktuelles Datum (automatisch formatiert)
- `{{agentName}}` → Name des bearbeitenden Agents

---

## 📤 EXPORT

### **Einzelnes Template exportieren:**
1. Gehe zu `/templates`
2. Finde dein Template
3. Klick "📥 Export"
4. JSON-Datei wird heruntergeladen

### **Alle Templates exportieren:**
1. Gehe zu `/templates`
2. (Optional) Wähle Kategorie-Filter
3. Klick "📤 Export All"
4. JSON-Array mit allen Templates wird heruntergeladen

### **Verwendung der Exports:**
- ✅ Backup
- ✅ Teilen mit anderen
- ✅ Versionskontrolle (Git)
- ✅ AI-Training mit bestehenden Templates
- ✅ Bulk-Import in andere Umgebung

---

## 🤖 ERWEITERTE AI-WORKFLOWS

### **Workflow 1: Batch-Erstellung**

Prompt:
```
Erstelle 5 Templates aus dieser Dokumentation:
1. Für Kunden
2. Für Nichtkunden
3. Für Employees
4. Für Applicants
5. Für Funeral Homes

Gib mir ein JSON-Array mit allen 5 Templates zurück.
Format: [{ ... }, { ... }, ...]
```

### **Workflow 2: Template-Verbesserung**

1. Exportiere bestehendes Template
2. Prompt: "Verbessere dieses GDPR-Template: [JSON HIER]"
3. AI verbessert Text, Struktur, Prozess-Schritte
4. Re-import mit verbesserter Version

### **Workflow 3: Übersetzung**

1. Exportiere deutsches Template
2. Prompt: "Übersetze dieses Template ins Englische, behalte JSON-Struktur"
3. Import der englischen Version

### **Workflow 4: Template-Konsolidierung**

1. Exportiere mehrere ähnliche Templates
2. Prompt: "Kombiniere diese Templates zu einem universellen Template"
3. Import des konsolidierten Templates

---

## ⚠️ WICHTIGE HINWEISE

### **PII (Personally Identifiable Information):**
- ❌ **Niemals** echte Kundendaten in Templates
- ✅ **Immer** Platzhalter verwenden (`{{customerName}}`, etc.)
- ✅ Generic Beispiele sind okay

### **JSON-Syntax:**
- ✅ Doppelte Anführungszeichen für Strings
- ✅ Escape Special Characters: `\n` für Zeilenumbruch
- ✅ Arrays mit eckigen Klammern: `[]`
- ✅ Objects mit geschweiften Klammern: `{}`

### **Quality Check:**
- ✅ Teste Template nach Import
- ✅ Prüfe Variablen-Ersetzung
- ✅ Verifiziere Prozess-Schritte
- ✅ Links testen

---

## 🎯 QUICK TIPS

1. **Start Simple**: Beginne mit einem einfachen Template
2. **Iteriere**: Exportiere → Verbessere → Re-import
3. **Version Control**: Nutze Git für JSON-Dateien
4. **Dokumentiere**: Füge Kommentare in JSON hinzu (AI entfernt sie beim Import)
5. **Konsistenz**: Nutze gleiche categoryId/requesterTypeId-Namenskonventionen

---

## 📚 BEISPIELE

### **Einfaches Template:**
```json
{
  "name": "Data Deletion - Customer - Simple",
  "categoryId": "data-deletion",
  "requesterTypeId": "customer",
  "content": "Dear {{customerName}},\n\nWe have received your data deletion request under case {{caseId}}.\n\nBest regards,\n{{agentName}}",
  "processSteps": [
    {
      "title": "Verify Identity",
      "description": "Check customer number in MineOS"
    }
  ],
  "confluenceLinks": [],
  "jiraTemplate": "Customer requested data deletion."
}
```

### **Komplexes Template:**
```json
{
  "name": "Data Deletion - Customer - Full Process",
  "categoryId": "data-deletion",
  "requesterTypeId": "customer",
  "content": "Dear {{customerName}},\n\nThank you for your GDPR request ({{caseId}})...",
  "processSteps": [
    {
      "title": "Step 1: Verify Identity",
      "description": "Check customer number and email in MineOS and OWL"
    },
    {
      "title": "Step 2: Check Subscriptions",
      "description": "Ensure all active subscriptions are cancelled"
    },
    {
      "title": "Step 3: Execute Deletion",
      "description": "Run deletion script in MineOS"
    },
    {
      "title": "Step 4: Confirm",
      "description": "Send confirmation email to customer"
    }
  ],
  "confluenceLinks": [
    "https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/123456",
    "https://hellofresh.atlassian.net/wiki/spaces/CS/pages/789012"
  ],
  "jiraTemplate": "Customer {{customerName}} requested data deletion.\nIdentity verified via email.\nSubscriptions cancelled.\nDeletion executed in MineOS.\nConfirmation sent."
}
```

---

**Happy Template-Building mit AI!** 🤖✨
