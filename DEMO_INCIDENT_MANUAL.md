# Demo Incident - Manuelle Erstellung

## So erstellst du den Demo-Incident für die Präsentation:

### 1. Öffne: http://localhost:3001/incidents/new

### 2. Step 1: Incident Details

**Nature of Incident:**
```
Unauthorized access to customer database via SQL injection vulnerability
```

**Affected Systems:** (alle auswählen)
- CRM
- Payment System  
- Email Platform
- Customer Portal

**Discovery Date:** Heute - 2 Tage

**Impact Period Start:** Heute - 3 Tage  
**Impact Period End:** Heute - 2 Tage (6 Stunden nach Start)

---

### 3. Step 2: Impact Analysis

**Country Impact** (alle Länder ausfüllen):

| Country | Volume | Complaints |
|---------|--------|------------|
| **DE**  | 12500  | 45         |
| **AT**  | 3200   | 12         |
| **CH**  | 2100   | 8          |
| **BE**  | 8900   | 28         |
| **NL**  | 15600  | 52         |
| **LU**  | 800    | 3          |
| **FR**  | 5500   | 18         |
| **SE**  | 4300   | 15         |
| **DK**  | 2800   | 9          |
| **NO**  | 1900   | 6          |

**Total:** 57,600 impacted customers

---

### 4. Step 3: Legal Risk Assessment

**Breach Type:**
```
Loss of Confidentiality
```

**Primary Legal Risk:**
```
Loss of Confidentiality
```

**Notification Decision:**
```
Authority Notification Required
```

---

### 5. Nach Erstellung: Incident bearbeiten

Gehe zum erstellten Incident und füge folgende Details hinzu:

#### Investigation Phase

**Root Cause:**
```
SQL injection vulnerability in legacy customer search API endpoint (/api/v1/customers/search). The vulnerability was introduced during a refactoring in Q2 2025 when input sanitization was accidentally removed from the search parameter. An automated security scan by an external party discovered and exploited this vulnerability to access customer records.

Technical Analysis:
- Vulnerable endpoint: GET /api/v1/customers/search?query=[UNSANITIZED_INPUT]
- Attack vector: Union-based SQL injection
- Duration of exposure: Approximately 8 months (June 2025 - February 2026)
- Access logs show 127 unauthorized queries between Feb 10-12, 2026
```

**Technical Resolution:**
```
Immediate Actions Taken:
1. Disabled vulnerable API endpoint at 14:23 CET on discovery day
2. Deployed emergency patch with parameterized queries and input validation
3. Implemented Web Application Firewall (WAF) rules to block SQL injection patterns
4. Rotated all database credentials and API keys
5. Enhanced logging and monitoring for all customer data access

Long-term Fixes:
- Migrated to prepared statements across all database queries
- Implemented mandatory code review process for database interactions
- Deployed static code analysis tools in CI/CD pipeline (SonarQube)
- Scheduled quarterly penetration testing
- Enhanced developer security training program
```

**Risk Assessment:** High

---

#### Containment Phase

**Containment Measures:**
```
Immediate Containment (within 2 hours of discovery):
1. Isolated affected API endpoint and database server
2. Implemented emergency access restrictions on customer database
3. Blocked suspicious IP addresses at firewall level (18 IPs identified)
4. Enabled read-only mode for customer data access across all services
5. Initiated comprehensive access log audit

Secondary Containment (within 24 hours):
1. Deployed patched version with input sanitization and parameterized queries
2. Implemented rate limiting on all customer data APIs (100 req/min per IP)
3. Added real-time anomaly detection for database queries
4. Established 24/7 monitoring team for incident response
5. Created incident response war room with Security, Legal, and Engineering teams

Verification completed by Security Team with full penetration test confirming vulnerability closure.
```

---

#### Resolution Phase

**Resolution Description:**
```
Complete resolution achieved through multi-layered approach:

Technical Resolution:
- All vulnerable code paths identified and patched (23 endpoints total)
- Comprehensive security audit completed across entire codebase
- Enhanced input validation framework deployed organization-wide
- Database access layer completely rewritten with security best practices
- Automated security scanning integrated into deployment pipeline

Customer Impact Mitigation:
- Direct email notification sent to all 57,600 affected customers
- Dedicated support hotline established (received 892 calls, avg wait time <2 min)
- 12 months of free credit monitoring service offered to all affected customers
- Transparent incident report published on corporate website
- Town hall meeting held with customer advocacy groups
```

**Preventive Measures:**
```
Organizational Changes:
1. Established dedicated Application Security team (5 full-time engineers)
2. Implemented mandatory security code review for all database interactions
3. Quarterly penetration testing by external security firm
4. Monthly security champions meetings across engineering teams
5. Updated incident response playbook based on lessons learned

Technical Safeguards:
1. Deployed Web Application Firewall (WAF) with OWASP ruleset
2. Implemented automated SAST/DAST in CI/CD pipeline
3. Database activity monitoring with ML-based anomaly detection
4. Zero-trust architecture for all internal API communications
5. API rate limiting and request validation at infrastructure level

Process Improvements:
1. Security design review required for all new features
2. Bi-annual security training for all technical staff
3. Bug bounty program launched with HackerOne
4. Regular security awareness campaigns
5. Established clear escalation paths for security incidents
```

---

### 6. Tasks abhaken

Gehe durch die Action Plan Tasks und markiere sie als abgeschlossen (grüner Haken klicken).

---

### 7. Status auf "Closed" setzen

Klicke auf "Move to [nächster Status]" bis der Incident Status "Closed" ist.

---

## ✅ Demo-Ready!

Jetzt kannst du:
1. **"Export PDF"** klicken → Zeigt vollständigen Report
2. **"Export CSV"** klicken → Zeigt technisches Backup
3. Audit Trail zeigt alle Änderungen mit deiner Email
4. Alle Sections (Investigation, Containment, Resolution) sind gefüllt
5. Alle Tasks sind completed ([X])
6. Multi-Country Impact ist dokumentiert

---

**Tipp für Präsentation:**
- Öffne das Incident Detail
- Scrolle durch alle Sections
- Zeige die completed Tasks mit External Links
- Dann: Export PDF → Öffne das PDF → Zeige das professionelle Layout
- Erkläre: "Legal Teams können diese Reports an Jira tickets oder Google Drive anhängen"
