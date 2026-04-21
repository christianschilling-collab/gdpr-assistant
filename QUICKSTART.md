# ⚡ GDPR Assistant - Quick Start

Wenn du später zurückkommst und schnell loslegen willst.

## 🚀 In 3 Schritten starten:

### 1️⃣ Projekt in Cursor öffnen

```bash
cd /Users/christian.schilling/gdpr-assistant-cursor
cursor .
```

### 2️⃣ Server starten

Terminal in Cursor öffnen (`Ctrl + ` `) und eingeben:

```bash
npm run dev
```

### 3️⃣ Im Browser öffnen

→ **http://localhost:3001**

**Das war's!** 🎉

---

## 📖 Mehr Details?

→ Siehe **PROJECT_STATUS.md** für:
- Vollständige Projekt-Dokumentation
- Was bereits funktioniert
- Nächste Schritte
- Cursor AI Prompts
- Troubleshooting

---

## 🆘 Problem beim Starten?

### "Cannot find module" Error
```bash
npm install
```

### Port-Konflikt
```bash
# Einfach den neuen Port nutzen, den Next.js anzeigt
# z.B. http://localhost:3001
```

### Firebase Error
```bash
# Überprüfe dass .env.local existiert:
ls -la .env.local

# Falls nicht, kopiere:
cp .env.local.example .env.local
# und fülle die Werte ein (siehe PROJECT_STATUS.md)
```

---

## 💬 Nächste Schritte mit Cursor

Öffne Cursor Chat (`Cmd + L`) und probiere:

```
Create sample data - add 3 test GDPR cases to Firestore
```

```
Add a "New Case" form at /cases/new
```

```
Show me what features are missing from the old Google Apps Script version
```

---

**Du hast bereits alle Grundlagen!** Der Rest ist Entwicklung. Viel Spaß! 🚀
