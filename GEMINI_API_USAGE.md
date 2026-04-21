# 🤖 Gemini API Verwendung in der GDPR Assistant App

## Übersicht

Die GDPR Assistant App nutzt **Google Gemini AI (gemini-2.0-flash & gemini-1.5-flash)** für intelligente GDPR-Case-Verarbeitung.

**API Key:** Im `.env.local` unter `GEMINI_API_KEY`

---

## 🎯 Hauptfunktionen der Gemini API

### 1. **Case Classification (Klassifizierung)** 🏷️

**Datei:** `lib/gemini/client.ts` → `classifyCase()`  
**Endpunkt:** `/api/classify-case`  
**Model:** `gemini-2.0-flash`

**Was macht es:**
- Analysiert GDPR-Case-Beschreibungen
- Bestimmt automatisch die **richtige GDPR-Kategorie**
  - z.B. "Data Deletion", "Data Access Request", "Marketing Opt-Out"
- Berücksichtigt den **Requester Type** (Kunde, Nicht-Kunde, Mitarbeiter)
- Gibt **Confidence Score** zurück (0.0 - 1.0)
- Liefert **Reasoning** (Erklärung der Klassifizierung)

**Beispiel:**
```
Input: "Ich möchte alle meine Daten gelöscht haben"
Output: {
  primaryCategory: "data-deletion",
  confidence: 0.95,
  reasoning: "Clear data deletion request from customer"
}
```

**Wo verwendet:**
- `/app/cases/new/page.tsx` - Beim Erstellen neuer Cases
- `/app/cases/[id]/page.tsx` - Beim Re-Klassifizieren bestehender Cases

---

### 2. **PII Sanitization (Persönliche Daten entfernen)** 🔒

**Datei:** `app/api/sanitize-pii/route.ts`  
**Endpunkt:** `/api/sanitize-pii`  
**Model:** `gemini-1.5-flash`

**Was macht es:**
- **GDPR-Compliance!** Entfernt PII (Personally Identifiable Information)
- Identifiziert:
  - Namen → `[NAME]`
  - E-Mail-Adressen → `[EMAIL]`
  - Adressen → `[ADDRESS]`
  - Telefonnummern → `[PHONE]`
- Ersetzt PII mit Platzhaltern
- Gibt Liste der gefundenen PII zurück (für Audit)

**Beispiel:**
```
Input: "Max Mustermann (max@example.com) wohnt in Berlin, Hauptstr. 123"
Output: {
  sanitizedText: "[NAME] ([EMAIL]) wohnt in [ADDRESS]",
  piiFound: {
    names: ["Max Mustermann"],
    emails: ["max@example.com"],
    addresses: ["Berlin, Hauptstr. 123"],
    phoneNumbers: []
  }
}
```

**Wo verwendet:**
- `/app/cases/new/page.tsx` - **BEVOR** der Case in Firestore gespeichert wird

**Wichtig:** 
- ✅ PII wird NIE in Firestore gespeichert
- ✅ Nur sanitisierte Daten kommen in die Datenbank
- ✅ GDPR-konform!

---

### 3. **Template Matching (Vorlagen-Empfehlung)** 📄

**Datei:** `lib/gemini/client.ts` → `matchTemplates()`  
**Model:** `gemini-2.0-flash`

**Was macht es:**
- Matched GDPR-Cases mit vordefinierten Antwort-Templates
- Berücksichtigt:
  - **Kategorie-Match** (Data Deletion, Access, etc.)
  - **Requester Type Match** (Kunde vs. Nicht-Kunde)
  - **Keyword-Relevanz**
  - **"When to Use" Beschreibung**
- Gibt Top 2 Template-Empfehlungen zurück mit:
  - Confidence Score
  - Reasoning

**Beispiel:**
```
Input: Case = "Datenlöschung angefragt", Category = "Data Deletion"
Output: [
  {
    template: {...},
    confidence: 0.95,
    reason: "Perfect match for customer data deletion request"
  }
]
```

**Wo verwendet:**
- `/app/cases/[id]/page.tsx` - Nach Case-Klassifizierung

---

### 4. **Detail Extraction (Kundendetails erkennen)** 🔍

**Datei:** `lib/gemini/client.ts` → `extractDetails()`  
**Endpunkt:** `/api/classify-case` (intern)
**Model:** `gemini-2.0-flash`

**Was macht es:**
- Extrahiert Kundeninformationen aus Case-Beschreibungen
- Findet:
  - Vorname / Nachname
  - E-Mail-Adressen
  - Kundennummern
  - Datumsinformationen
- Nur für Template-Befüllung (nicht für Firestore!)

**Beispiel:**
```
Input: "Kunde Max Müller (max@example.com) möchte seine Daten..."
Output: {
  firstName: "Max",
  lastName: "Müller",
  email: "max@example.com"
}
```

**Wo verwendet:**
- `/api/classify-case` - Auto-Vervollständigung von Kundendetails

---

### 5. **Draft Reply Generation (Antwort-Entwurf)** ✍️

**Datei:** `lib/gemini/client.ts` → `generateDraftReply()`  
**Model:** `gemini-2.0-flash`

**Was macht es:**
- Erstellt personalisierte GDPR-Antworten
- Nutzt Template + extrahierte Kundendetails
- Füllt Platzhalter aus:
  - `((Anrede))` → "Sehr geehrte/r"
  - `((Vorname))` → "Max"
  - `((Nachname))` → "Müller"
  - etc.

**Beispiel:**
```
Template: "Sehr geehrte/r ((Anrede)) ((Nachname)), ..."
Details: { firstName: "Max", lastName: "Müller" }
Output: "Sehr geehrter Herr Müller, ..."
```

**Wo verwendet:**
- `/app/cases/[id]/page.tsx` - Nach Template-Auswahl

---

## 🔄 Workflow: Neuer Case

```
User füllt Case-Formular aus
    ↓
🔒 Step 1: PII Sanitization
    POST /api/sanitize-pii
    → Entfernt Namen, Emails, Adressen
    ↓
🏷️ Step 2: AI Classification
    POST /api/classify-case
    → Bestimmt Category
    → Extrahiert Kundendetails
    ↓
📄 Step 3: Template Matching
    matchTemplates()
    → Empfiehlt passende Templates
    ↓
✍️ Step 4: Draft Reply Generation
    generateDraftReply()
    → Erstellt personalisierten Entwurf
    ↓
💾 Step 5: Speichern in Firestore
    → NUR sanitisierte Daten!
```

---

## 📊 Gemini Model Usage

| Funktion | Model | Warum |
|----------|-------|-------|
| Case Classification | gemini-2.0-flash | Neuster, schnellster |
| PII Sanitization | gemini-1.5-flash | Stabil für Compliance |
| Template Matching | gemini-2.0-flash | Bessere Reasoning |
| Detail Extraction | gemini-2.0-flash | Bessere Extraktion |
| Draft Generation | gemini-2.0-flash | Bessere Texte |

---

## 🔐 Sicherheit & GDPR-Compliance

### **Gemini API sieht:**
- ✅ Case-Beschreibungen (für Klassifizierung)
- ✅ Kundennamen/Emails (für Template-Befüllung)

### **Firestore speichert:**
- ❌ KEINE Kundennamen
- ❌ KEINE Email-Adressen
- ❌ KEINE Adressen
- ✅ NUR sanitisierte Platzhalter: `[NAME]`, `[EMAIL]`, etc.
- ✅ Kundennummer (OK als Referenz)

### **Wichtig:**
- Gemini API ist **Server-Side Only** (nie Client-Side)
- API Key ist in `.env.local` (nicht im Frontend)
- PII wird **vor** dem Speichern entfernt
- Gemini-Logs werden nach kurzer Zeit gelöscht (Google Policy)

---

## 💰 API Kosten

**Google Gemini API Pricing (Free Tier):**
- ✅ **15 Requests/Minute** kostenlos
- ✅ **1.500 Requests/Tag** kostenlos
- ✅ **1 Million Requests/Monat** kostenlos

**Typischer Case:**
- PII Sanitization: 1 Request
- Classification: 1 Request
- Template Matching: 1 Request
- Draft Generation: 1 Request
- **Total: ~4 Requests pro Case**

**Bei 100 Cases/Tag:**
- 400 Requests/Tag → **Innerhalb Free Tier** ✅

---

## 🔧 Konfiguration

### Environment Variable:
```bash
GEMINI_API_KEY=AIzaSyA...
```

### API Key erstellen:
1. https://aistudio.google.com/app/apikey
2. "Create API Key"
3. In `.env.local` einfügen

---

## 🧪 Testing

**Test Connection:**
```bash
npm run test:connections
```

**Test Script:**
```javascript
// scripts/test-connections.ts
import { testConnection } from '@/lib/gemini/client';

const result = await testConnection();
// Expected: "Connection successful!"
```

---

## 📝 Zusammenfassung

**Gemini wird für 5 Hauptfunktionen verwendet:**

1. 🏷️ **Case Classification** - Automatische Kategorisierung
2. 🔒 **PII Sanitization** - GDPR-konforme Datenbereinigung
3. 📄 **Template Matching** - Intelligente Vorlagen-Empfehlung
4. 🔍 **Detail Extraction** - Kundeninformationen erkennen
5. ✍️ **Draft Generation** - Personalisierte Antwort-Entwürfe

**Alle Features sind:**
- ✅ Server-Side Only (sicher)
- ✅ GDPR-konform (keine PII in Firestore)
- ✅ Kostenlos (innerhalb Free Tier)
- ✅ Schnell (gemini-2.0-flash)

---

**Status:** ✅ Produktiv im Einsatz  
**Dependency:** `@google/generative-ai` (bereits installiert)
