# 📧 Sample Approved Email Templates for Firestore

Copy these templates into your Firestore `templates` collection to test the approved template feature.

---

## Template 1: Datenauskunft Acknowledgement (German)

**Collection:** `templates`  
**Document ID:** Auto-generate or use `template_data_access_ack_de`

```json
{
  "primaryCategory": "Datenauskunft",
  "requesterType": "Customer",
  "templateName": "Datenauskunft Eingangsbestätigung (DE)",
  "templateText": "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten. Wir haben Ihre Anfrage am {{RECEIVED_DATE}} erhalten und werden diese gemäß Art. 12 Abs. 3 DSGVO innerhalb von 30 Tagen bearbeiten.\n\nIhre Referenznummer: {{CASE_ID}}\n\nWir werden uns in Kürze bei Ihnen melden, sobald wir Ihre Daten zusammengestellt haben. Falls Sie weitere Fragen haben, kontaktieren Sie uns gerne unter Angabe Ihrer Referenznummer.\n\nMit freundlichen Grüßen\nHelloFresh Customer Care Team\n\nDatenschutzbeauftragter: privacy@hellofresh.com",
  "keywords": ["email", "acknowledgement", "eingangsbestätigung", "antwort", "datenauskunft"],
  "whenToUse": "Send immediately after receiving a data access request from a customer",
  "confluenceLink": "",
  "mineosAuto": false,
  "processSteps": [],
  "jiraNoteTemplate": "",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z",
  "version": "1.0",
  "versionHistory": []
}
```

---

## Template 2: Werbewiderruf Confirmation (German)

**Collection:** `templates`  
**Document ID:** Auto-generate or use `template_marketing_optout_de`

```json
{
  "primaryCategory": "Werbewiderruf",
  "requesterType": "Customer",
  "templateName": "Marketing Opt-Out Bestätigung (DE)",
  "templateText": "Sehr geehrte Damen und Herren,\n\nwir bestätigen hiermit, dass Ihre Marketing-Einwilligung für die E-Mail-Adresse {{CUSTOMER_EMAIL}} zurückgenommen wurde.\n\nSie werden ab sofort keine Marketing-E-Mails mehr von HelloFresh erhalten. Bitte beachten Sie:\n• Transaktionale E-Mails (Bestellbestätigungen, Lieferupdates) werden weiterhin versendet\n• Die vollständige Deaktivierung kann bis zu 48 Stunden dauern\n• Sie können sich jederzeit wieder für Marketing-E-Mails anmelden\n\nReferenznummer: {{CASE_ID}}\n\nBei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\nHelloFresh Customer Care Team",
  "keywords": ["email", "marketing", "opt-out", "werbewiderruf", "abmeldung", "bestätigung"],
  "whenToUse": "Send after processing a marketing opt-out request",
  "confluenceLink": "",
  "mineosAuto": true,
  "processSteps": [],
  "jiraNoteTemplate": "",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z",
  "version": "1.0",
  "versionHistory": []
}
```

---

## Template 3: ID Request (German)

**Collection:** `templates`  
**Document ID:** Auto-generate or use `template_id_request_de`

```json
{
  "primaryCategory": "Datenauskunft",
  "requesterType": "Customer",
  "templateName": "Identitätsverifizierung Anforderung (DE)",
  "templateText": "Sehr geehrte Damen und Herren,\n\num Ihre Anfrage gemäß DSGVO bearbeiten zu können, benötigen wir von Ihnen folgende Informationen zur Identitätsverifizierung:\n\n1. Ihre vollständige Adresse (Straße, Hausnummer, PLZ, Ort)\n2. Die E-Mail-Adresse, die mit Ihrem HelloFresh-Konto verknüpft ist\n3. Ihre Kundennummer (falls vorhanden)\n4. Optional: Eine Kopie eines Ausweisdokuments mit geschwärzten Daten (außer Name und Geburtsdatum)\n\nDiese Informationen sind gemäß Art. 12 Abs. 6 DSGVO erforderlich, um sicherzustellen, dass wir Ihre personenbezogenen Daten nur an die berechtigte Person weitergeben.\n\nBitte senden Sie uns diese Informationen als Antwort auf diese E-Mail. Ihre Referenznummer: {{CASE_ID}}\n\nSobald wir Ihre Identität verifiziert haben, werden wir Ihre Anfrage umgehend bearbeiten.\n\nMit freundlichen Grüßen\nHelloFresh Customer Care Team\n\nDatenschutzbeauftragter: privacy@hellofresh.com",
  "keywords": ["email", "id_request", "identität", "verifizierung", "ausweis", "legitimation"],
  "whenToUse": "Send when identity verification is required before processing a GDPR request",
  "confluenceLink": "",
  "mineosAuto": false,
  "processSteps": [],
  "jiraNoteTemplate": "",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z",
  "version": "1.0",
  "versionHistory": []
}
```

---

## Template 4: Negative Response - No Data Found (German)

**Collection:** `templates`  
**Document ID:** Auto-generate or use `template_negative_response_de`

```json
{
  "primaryCategory": "Datenauskunft",
  "requesterType": "Customer",
  "templateName": "Negativauskunft - Keine Daten gefunden (DE)",
  "templateText": "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten.\n\nNach sorgfältiger Prüfung unserer Systeme müssen wir Ihnen mitteilen, dass wir zu den von Ihnen angegebenen Informationen keine personenbezogenen Daten in unserer Datenbank gefunden haben.\n\nGrund: {{REASON}}\n\nMögliche Ursachen:\n• Die angegebene E-Mail-Adresse ist nicht in unserem System registriert\n• Es wurde noch nie ein Konto mit diesen Daten angelegt\n• Das Konto wurde bereits vollständig gelöscht\n\nFalls Sie weitere Informationen haben oder glauben, dass diese Auskunft nicht korrekt ist, kontaktieren Sie uns bitte erneut mit zusätzlichen Details (z.B. andere E-Mail-Adressen, Kundennummer, Bestellnummern).\n\nReferenznummer: {{CASE_ID}}\n\nMit freundlichen Grüßen\nHelloFresh Customer Care Team\n\nDatenschutzbeauftragter: privacy@hellofresh.com",
  "keywords": ["email", "negative", "keine daten", "negative_response", "not found"],
  "whenToUse": "Send when no personal data is found for the requester",
  "confluenceLink": "",
  "mineosAuto": false,
  "processSteps": [],
  "jiraNoteTemplate": "",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z",
  "version": "1.0",
  "versionHistory": []
}
```

---

## Template 5: Data Package Delivery (German)

**Collection:** `templates`  
**Document ID:** Auto-generate or use `template_data_package_de`

```json
{
  "primaryCategory": "Datenauskunft",
  "requesterType": "Customer",
  "templateName": "Datenpaket Zusendung (DE)",
  "templateText": "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie die von Ihnen angeforderten personenbezogenen Daten, die wir über Sie bei HelloFresh gespeichert haben.\n\nDie Daten sind im Anhang als PDF-Datei (verschlüsselt) beigefügt und enthalten:\n• Kontodetails (Name, Adresse, E-Mail, Telefon)\n• Bestellhistorie mit Lieferadressen\n• Zahlungsinformationen (letzte 4 Ziffern)\n• Kommunikationsverlauf mit Customer Care\n• Marketing-Präferenzen und Einwilligungen\n• App-Nutzungsdaten und Login-Historie\n\nPasswort zum Öffnen der PDF-Datei: {{CASE_ID}}\n\nFalls Sie Fragen zu den bereitgestellten Daten haben, weitere Informationen benötigen oder von Ihren Rechten gemäß DSGVO Gebrauch machen möchten (z.B. Löschung, Berichtigung), kontaktieren Sie uns gerne.\n\nReferenznummer: {{CASE_ID}}\n\nMit freundlichen Grüßen\nHelloFresh Customer Care Team\n\nDatenschutzbeauftragter: privacy@hellofresh.com",
  "keywords": ["email", "data_package", "datenpaket", "auskunft", "pdf", "data export"],
  "whenToUse": "Send when delivering the compiled personal data to the requester",
  "confluenceLink": "",
  "mineosAuto": false,
  "processSteps": [],
  "jiraNoteTemplate": "",
  "createdAt": "2026-03-09T10:00:00Z",
  "updatedAt": "2026-03-09T10:00:00Z",
  "version": "1.0",
  "versionHistory": []
}
```

---

## 🔧 How to Import These Templates

### Option 1: Firebase Console (Manual)

1. Go to Firebase Console → Firestore Database
2. Navigate to `templates` collection
3. Click "Add Document"
4. Copy-paste the JSON above (convert timestamps to Firestore Timestamp objects)
5. Click "Save"

### Option 2: Firestore Import Tool (Bulk)

If you have many templates, consider using a Firestore import script or the Firebase Admin SDK.

### Option 3: Use the Admin UI (Recommended)

1. Go to `http://localhost:3000/admin/templates/new`
2. Copy the `templateText` field from above
3. Fill in the form manually
4. Add keywords (comma-separated)
5. Click "Save"

---

## ✅ Verify Templates Are Working

1. Create a test case with **Category = Datenauskunft**, **Requester Type = Customer**
2. Initialize workflow
3. Go to first step: "Send Acknowledgement Email"
4. Click **"✨ Generate Email"**
5. **Expected Result**: Generated email should use the EXACT text from "Template 1" above
6. Only {{CASE_ID}} and {{RECEIVED_DATE}} should be replaced

---

## 📝 Placeholders Reference

These placeholders will be automatically replaced by the AI:

- `{{CASE_ID}}` → e.g., "2026-001"
- `{{CUSTOMER_NAME}}` → Customer's name (if available)
- `{{CUSTOMER_EMAIL}}` → Customer's email
- `{{RECEIVED_DATE}}` → Date the request was received
- `{{REASON}}` → Custom reason (for negative responses)
- `{{DEADLINE}}` → 30 days from receipt date

**Note:** You can add custom placeholders, and the AI will attempt to fill them based on case context.

---

## 🎨 Customization Tips

1. **Add Market-Specific Templates**: Create separate templates for DE, AT, CH markets
2. **Add Requester-Type Variations**: Different wording for Customers vs. Employees
3. **Include Legal References**: Always reference GDPR articles (Art. 12, 15, 17, etc.)
4. **Keep It Professional**: Use formal German ("Sie" form)
5. **Test Thoroughly**: Generate emails and verify wording is preserved

**Happy Template Building! 📧✨**
