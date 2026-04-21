# 🚀 Quick Start Guide - AI Trailblazers Multi-Team

## Lokales Testing (ohne Firestore Deployment)

### 1. Dev Server starten

```bash
npm run dev
```

→ Öffne http://localhost:3000

---

## ✅ Was du jetzt testen kannst (ohne Firestore):

### Landing Page
**URL:** http://localhost:3000/welcome

**Funktionalität:**
- ✅ Hero Section mit Login Button
- ✅ Features Grid (3 Cards)
- ✅ "How It Works" Steps
- ✅ Responsive Design

**Hinweis:** Login Button funktioniert noch nicht perfekt (kein UserProfile Redirect), aber UI ist sichtbar.

---

### Self-Evaluation Form
**URL:** http://localhost:3000/onboarding/self-evaluation

**Funktionalität:**
- ✅ 5 Categories (Prompt Engineering, AI Tools, etc.)
- ✅ Level Selection (1-5)
- ✅ Progress Bar
- ✅ Back/Next Navigation
- ✅ Speichert in localStorage (kein Firestore nötig!)

**Test-Flow:**
1. Öffne `/onboarding/self-evaluation`
2. Wähle Level für jede Category
3. Klicke "Complete Evaluation"
4. → Redirect zu `/onboarding/recommendations`

---

### Resource Recommendations
**URL:** http://localhost:3000/onboarding/recommendations

**Funktionalität:**
- ✅ Zeigt personalisierte Resources basierend auf Self-Evaluation
- ✅ Resources gruppiert nach Category
- ✅ Priority Labels (high/medium/low)
- ✅ "Open" Links zu echten Resources
- ✅ "Save" Button (noch ohne Firestore)

**Hinweis:** Nutzt localStorage Daten von Self-Evaluation + 20 Default Resources.

---

## 🎨 UI Components die funktionieren:

### 1. Landing Page (`/welcome`)
- Hero mit Gradient Background
- Feature Cards
- How It Works Timeline
- Footer

### 2. Self-Evaluation (`/onboarding/self-evaluation`)
- Multi-Step Form
- Progress Indicator
- Level Selection Buttons
- Notes Fields

### 3. Recommendations (`/onboarding/recommendations`)
- Resource Cards
- Priority Labels
- Skill Level Indicators
- Call-to-Action

---

## ⚠️ Was NICHT funktioniert (benötigt Firestore):

### Firebase/Auth Abhängigkeiten:
- ❌ Login Flow (kein User Profile)
- ❌ getUserProfile() Calls
- ❌ submitSelfEvaluation() zu Firestore
- ❌ Team/Cluster CRUD operations

### Workaround für Testing:
Die UI Components nutzen **localStorage** statt Firestore:
- Self-Evaluation → localStorage
- Recommendations → liest aus localStorage

---

## 📝 Nächste Schritte (für Firestore Integration):

### Phase 1: Firestore Rules (lokal)
```bash
# Erstelle lokale Firestore Rules Datei
# → firestore-rules-multi-team.txt
```

### Phase 2: Auth Context Update
```bash
# Passe lib/contexts/AuthContext.tsx an
# → Nutzt neue getUserProfile() Function
```

### Phase 3: Test mit echtem Firebase
```bash
# Replace localStorage mit Firestore Calls
# → Self-Evaluation schreibt zu Firestore
# → Recommendations liest von Firestore
```

---

## 🧪 Empfohlener Test-Flow (jetzt):

```
1. Öffne http://localhost:3000/welcome
   → Schau dir Landing Page an

2. Navigiere zu /onboarding/self-evaluation
   → Fülle Evaluation aus (5 Categories)
   → Klicke "Complete Evaluation"

3. Redirect zu /onboarding/recommendations
   → Sieh personalisierte Resources
   → Teste "Open" und "Save" Buttons

4. (Optional) Developer Tools öffnen
   → Application → Local Storage
   → Siehe 'self-evaluation' Key mit deinen Daten
```

---

## 💡 Tipps:

### Schneller Testen:
```javascript
// In Browser Console:
localStorage.setItem('self-evaluation', JSON.stringify({
  "Prompt Engineering": 3,
  "AI Tools Usage": 2,
  "Data Privacy & Ethics": 4,
  "Use Case Identification": 3,
  "Coding with AI": 2
}));

// Dann navigiere zu /onboarding/recommendations
```

### UI Testing ohne Auth:
Alle drei Pages (`/welcome`, `/onboarding/self-evaluation`, `/onboarding/recommendations`) sind direkt erreichbar ohne Login!

---

## 🎯 Ready to Test!

**Start hier:**
```bash
npm run dev
# → http://localhost:3000/welcome
```

**Viel Spaß beim Testen! 🚀**

---

## ❓ Troubleshooting

**Problem:** "Cannot read property 'email' of null"
→ Manche Components erwarten `user` von AuthContext
→ Workaround: Direkte URLs nutzen statt über Login

**Problem:** "Permission denied" bei Firestore
→ Normal! Firestore Rules sind noch nicht deployed
→ UI funktioniert trotzdem mit localStorage

**Problem:** Redirect funktioniert nicht
→ Manuell URL ändern (z.B. `/onboarding/recommendations`)
