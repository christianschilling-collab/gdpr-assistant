# GDPR Incident Assistant - Quick Reference

## URLs
- **Dashboard:** http://localhost:3001/incidents
- **New Incident:** http://localhost:3001/incidents/new
- **Admin Templates:** http://localhost:3001/admin/task-templates

## Key Features ⭐

### Export Options (Per Incident)
1. **Export PDF** → HelloFresh-branded report for auditors, Jira, Drive
2. **Export CSV** → Technical backup with complete data

### Incident Workflow
```
Reporting → Investigation → Containment → Resolution → Post-Incident Review → Closed
```

### Documentation Per Phase
- **Investigation:** Root cause, technical resolution, risk assessment
- **Containment:** Measures, verification
- **Resolution:** Description, preventive measures, verification

### Country Support
- **DACH:** Germany, Austria, Switzerland
- **BNL+France:** Belgium, Netherlands, Luxembourg, France
- **Nordics:** Sweden, Denmark, Norway

## Why Legal Teams Will Love This

✅ **Tool Independence:** Export PDFs work without access to the tool
✅ **Audit Ready:** Complete documentation + audit trail in exports
✅ **Jira Compatible:** Attach reports to existing tickets
✅ **GDPR Compliant:** 72h deadlines, country-specific tracking
✅ **Full History:** Every change tracked with user email

## Demo Checklist

- [ ] Show dashboard with active incidents
- [ ] Create new incident (3-step form)
- [ ] Navigate to incident detail page
- [ ] Show workflow status progression
- [ ] Add documentation (root cause, containment, resolution)
- [ ] Mark tasks as complete
- [ ] **Export PDF** → Open and show report
- [ ] **Export CSV** → Show in spreadsheet
- [ ] Show audit trail with user emails
- [ ] (Optional) Show admin task template configuration

## Talking Points

> "Legal teams can export professional PDF reports for every incident and attach them to Jira tickets or Google Drive. This means compliance documentation exists outside the tool and can be shared with auditors, DPAs, or external counsel."

> "Every field change is logged with the user's email address, creating a complete audit trail that meets regulatory requirements."

> "Tasks are auto-generated based on admin-configured templates, ensuring consistent workflows across all incidents."

> "Multi-country support allows tracking impact separately for each market's data protection authority."

---

**Status:** Ready for presentation ✅
**Server:** Running on port 3001
**Exports:** PDF (HelloFresh 2026 design) + CSV (technical backup)
