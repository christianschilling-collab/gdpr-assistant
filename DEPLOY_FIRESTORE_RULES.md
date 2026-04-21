# 🔥 Deploy Firestore Rules - Market Deep Dive Update

## Was wurde hinzugefügt?

Die neue `marketDeepDive` Collection für die monatlichen Market Analysis Reports.

## Firestore Rules Deployment

### Option 1: Über Firebase Console (Empfohlen für Shared Project)

1. **Öffne Firebase Console**:
   ```
   https://console.firebase.google.com/project/dach-ai-mvps/firestore/rules
   ```

2. **Füge diese Rule hinzu** (am Ende der GDPR Assistant Collections, vor den Quiz/Game Rules):

```javascript
// Market Deep Dive collection - Monthly market analysis reports
match /marketDeepDive/{reportId} {
  // Allow read access to all (for reporting)
  allow read: if true;
  
  // Allow create/update/delete for authenticated users
  allow create, update, delete: if request.auth != null;
}
```

3. **Klicke "Publish"**

4. **Teste die App**: Gehe zu `/admin/market-deep-dive` und klicke "Save Report"

### Option 2: Komplette Rules (Backup)

Falls du alle Rules neu deployen möchtest, findest du die kompletten Rules in:
```
firestore-rules-complete-with-deepdive.txt
```

## Nach dem Deployment

✅ **Speichern funktioniert**: Auf `/admin/market-deep-dive` kannst du jetzt "Save Report" klicken  
✅ **Daten persistieren**: Die Daten bleiben nach Reload erhalten  
✅ **Reporting funktioniert**: Auf `/reporting` werden alle Daten angezeigt  
✅ **LocalStorage nicht mehr nötig**: Firestore übernimmt die Persistierung

## Wichtig für Shared Firebase Project

Da das Firebase-Projekt mit 7 anderen Apps geteilt wird:
- ✅ Diese Rule fügt **nur** eine neue Collection hinzu
- ✅ **Keine** Änderungen an bestehenden Rules (Quiz, Games, Cases, etc.)
- ✅ Kein Risiko für andere Teams
- ✅ Chirurgisch präzise Änderung

## Troubleshooting

**Falls "Missing or insufficient permissions" erscheint:**
1. Prüfe, ob du bei Firebase angemeldet bist (Google Sign-In)
2. Prüfe, ob die Rules deployed wurden
3. Mache einen Hard Refresh (Cmd+Shift+R / Ctrl+Shift+F5)

**Zum Testen:**
1. Gehe zu `/admin/market-deep-dive`
2. Fülle Felder aus
3. Klicke "Save Report"
4. → Sollte "Market Deep Dive saved successfully!" anzeigen (grüner Toast)
5. Reload die Seite
6. → Daten sollten erhalten bleiben

---

**Status**: Ready to deploy 🚀
