# 🌍 Training Error Translations (DE → EN)

This file documents the German to English translations for training error categories used in the Management Report.

## 📋 Current Mappings

### Exact Matches (Full Categories)

| German | English |
|--------|---------|
| Werbewiderruf: Präferenzen im Kundenkonto nicht deaktiviert | Marketing Opt-Out: Preferences not deactivated in customer account |
| Allg. Ticketfehler: Falsche Kategorie gewählt | General Ticket Error: Wrong category selected |
| Falsche Länder-Angabe im Ticket (DE/CH/AT) | Wrong country specified in ticket (DE/CH/AT) |
| Ticket unvollständig (z.B. Kundennummer fehlt) | Incomplete ticket (e.g., customer number missing) |
| Data Deletion/Removal - Konto wurde nicht gekündigt | Data Deletion/Removal: Account not cancelled |
| Kunden-Verifikation angefordert anstelle Data-Privacy-Anliegen per Jira-Ticket zu eskalieren | Customer verification requested instead of escalating data privacy issue via Jira |
| Sonstige falsche Bearbeitung (bitte im Kommentar ergänzen) | Other incorrect processing (see notes) |

### Partial Matches (Fallback for New Variations)

| German Keyword | English Translation |
|----------------|---------------------|
| Werbewiderruf | Marketing Opt-Out |
| Präferenzen | Preferences not deactivated |
| Falsche Kategorie | Wrong category selected |
| Falsche Länder | Wrong country specified |
| Ticket unvollständig | Incomplete ticket |
| Datenlöschung | Data Deletion |
| Konto nicht gekündigt | Account not cancelled |
| Verifikation | Customer verification issue |
| Sonstige | Other |

## 🔧 How to Add New Translations

1. **Open**: `/Users/christian.schilling/gdpr-assistant-cursor/app/reporting/page.tsx`
2. **Find**: The `translateErrorDescription` function (near the top of the file)
3. **Add your mapping** to the `mappings` object:

```typescript
const mappings: Record<string, string> = {
  // Main categories (exact matches)
  'Neue deutsche Kategorie': 'New English Category',
  
  // ... existing mappings ...
};
```

4. **Save** and the translation will automatically work in:
   - The Reporting Dashboard UI
   - The Management Email Report (Copy Summary)

## 📊 Where It's Used

- **Reporting Dashboard**: `/reporting` (Agent Training Snapshot section)
- **Email Report**: "Copy Monthly Summary" button
- **Training Report Page**: `/admin/training-cases/report`

## 🎯 Translation Logic

1. **Exact Match**: First tries to find an exact match for the full German text
2. **Partial Match**: If no exact match, looks for any German keyword contained in the text
3. **Fallback**: If no match found, returns the original text (assumes it's already in English or a new category)

---

**Last Updated**: March 2026  
**Maintained by**: GDPR Team
