# Customer Type Workflow System

## 📋 Problemstellung

Es gibt unterschiedliche Workflows je nachdem, ob es sich um einen **Bestandskunden (Customer)** oder **Nichtkunden (Non-Customer)** handelt:

- **Beispiel:** Werbewiderruf von einem Kunden vs. Nichtkunden
- **Kunden:** Anderer Workflow, andere Templates, andere Checklisten/Prozesse
- **Nichtkunden:** Vereinfachter Workflow, andere Templates

## ✅ Aktuelle Situation

### Was bereits vorhanden ist:
1. ✅ `customerType` Feld in Cases (`Customer`, `Non-Customer`, `Unknown`)
2. ✅ `customerType` Feld in Templates
3. ✅ AI klassifiziert `customerType` automatisch
4. ✅ Templates können nach `customerType` gefiltert werden

### Was fehlt:
1. ❌ Template-Matching berücksichtigt `customerType` nicht
2. ❌ Keine unterschiedlichen Workflows/Checklisten je nach Customer Type
3. ❌ Keine visuelle Unterscheidung im UI
4. ❌ Keine automatische Workflow-Auswahl

## 🔧 Lösung: Erweiterte Customer Type Logik

### 1. Template-Matching erweitern

**Aktuell:** Templates werden nur nach `primaryCategory` und `subCategory` gefiltert.

**Erweitert:** Templates werden zusätzlich nach `customerType` gefiltert:
- Wenn Case `customerType = "Customer"` → nur Templates mit `customerType = "Customer"` oder `"Unknown"`
- Wenn Case `customerType = "Non-Customer"` → nur Templates mit `customerType = "Non-Customer"` oder `"Unknown"`
- Wenn Case `customerType = "Unknown"` → alle Templates

### 2. AI-Klassifizierung verbessern

**Aktuell:** AI erkennt Customer Type, aber Prompt könnte spezifischer sein.

**Erweitert:** Prompt gibt mehr Kontext:
- "Bestandskunde" / "Kunde" / "Customer" → `Customer`
- "Nichtkunde" / "kein Kunde" / "Non-Customer" → `Non-Customer`
- Keine Hinweise → `Unknown`

### 3. Workflow/Checklist System

**Neue Collection:** `workflows` oder `checklists`

Struktur:
```typescript
interface Workflow {
  id: string;
  name: string;
  customerType: 'Customer' | 'Non-Customer' | 'Both';
  primaryCategory: string; // Optional: spezifisch für Kategorie
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowStep {
  order: number;
  title: string;
  description: string;
  required: boolean;
  checklist?: string[]; // Optional: Unterpunkte
}
```

### 4. UI-Erweiterungen

1. **Case Detail Page:**
   - Customer Type Badge (hervorgehoben)
   - Workflow-Anzeige basierend auf Customer Type
   - Template-Filter zeigt nur passende Templates

2. **Template Selection:**
   - Automatische Filterung nach Customer Type
   - Warnung wenn kein passendes Template gefunden

3. **Workflow View:**
   - Checkliste je nach Customer Type anzeigen
   - Schritt-für-Schritt Anleitung

## 🚀 Implementierungsplan

### Phase 1: Template-Matching erweitern (Sofort)
- [ ] `matchTemplates()` Funktion erweitern
- [ ] Customer Type Filter hinzufügen
- [ ] Testen mit verschiedenen Customer Types

### Phase 2: AI-Klassifizierung verbessern (Sofort)
- [ ] Prompt erweitern mit mehr Kontext
- [ ] Beispiele für Customer/Non-Customer Erkennung
- [ ] Testen und validieren

### Phase 3: Workflow System (Optional, später)
- [ ] Workflow Collection erstellen
- [ ] Workflow UI erstellen
- [ ] Integration in Case Detail Page

### Phase 4: UI-Verbesserungen (Optional, später)
- [ ] Customer Type Badge
- [ ] Workflow-Anzeige
- [ ] Template-Filter UI

## 💡 Empfehlung

**Sofort umsetzen:**
1. Template-Matching erweitern (Customer Type Filter)
2. AI-Prompt verbessern

**Später:**
3. Workflow/Checklist System
4. UI-Verbesserungen

## 📝 Beispiel-Szenario

**Case:** "Werbewiderruf von max.mustermann@example.com"

**AI-Klassifizierung:**
- `primaryCategory`: "Marketing Consent"
- `subCategory`: "Opt-Out Request"
- `customerType`: "Customer" (wenn E-Mail in Kunden-DB gefunden) oder "Non-Customer"

**Template-Matching:**
- Wenn `customerType = "Customer"`:
  - Template: "Marketing Opt-Out - Customer" (mit Kunden-spezifischem Workflow)
- Wenn `customerType = "Non-Customer"`:
  - Template: "Marketing Opt-Out - Non-Customer" (vereinfachter Workflow)

**Workflow:**
- Customer: Vollständiger Prozess mit Account-Update, History-Tracking, etc.
- Non-Customer: Einfacher Opt-Out, keine Account-Änderungen
