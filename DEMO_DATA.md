# GDPR Assistant – Demo Data

Quick copy-paste examples for demos and testing.

---

## Escalation Example

### Basic Information

**Subject:**  
Right of Access (DSAR)

**Market:**  
DE

**Classification:**  
Customer

**CID or Email:**  
cid-12345678

**Jira Reference:**  
GDPR-4521

**Purecloud Interaction Link:**  
https://apps.mypurecloud.de/directory/#/engage/admin/interactions/abc123def456

---

### Case Summary

Customer requested full data export under GDPR Article 15. Initial response sent on March 5th was incomplete - missing order history from 2024. Customer escalated via email on March 8th expressing frustration about incomplete data and threatening regulatory complaint to data protection authority.

---

### Communication Timeline Entries

#### Entry 1
- **Sender:** Customer
- **Summary:** Customer requested complete data export including all order history, payment information, and communication logs from 2023-2026.
- **Interaction Link:** https://apps.mypurecloud.de/directory/#/engage/admin/interactions/abc123def456

#### Entry 2
- **Sender:** Customer Care
- **Summary:** Sent initial DSAR response with profile data and partial order history. Data export did not include orders from 2024 Q1-Q2 due to system migration issue.
- **Interaction Link:** https://apps.mypurecloud.de/directory/#/engage/admin/interactions/xyz789ghi012

#### Entry 3
- **Sender:** Customer
- **Summary:** Customer replied stating data is incomplete, threatening to file complaint with German data protection authority (BfDI) if not resolved within 48 hours.
- **Interaction Link:** https://apps.mypurecloud.de/directory/#/engage/admin/interactions/jkl345mno678

---

## Incident Example

### Basic Information

**Title:**  
Braze Email Unsubscribe Function Failure – Multi-Market Impact

**Type:**  
Data Subject Rights Violation

**Severity:**  
High

**Market Impact:**  
DE, AT, CH, NL, BE, LU

---

### Discovery Phase

**Description:**  
Customer Care team in Germany reported multiple customers complaining they clicked "unsubscribe" in marketing emails but continued receiving promotional messages. Initial investigation revealed Braze webhook for unsubscribe processing was returning 500 errors since March 7th, 08:00 CET.

**Affected Systems:**  
Braze (Marketing Automation), Customer Preference Center API, CRM Database

**Data Categories:**  
Marketing Preferences, Email Communication Consent

**Detection Method:**  
Customer complaints via support tickets

**Estimated Start:**  
2026-03-07

**Slack Thread:**  
https://hellofresh.slack.com/archives/C123ABC/p1234567890

---

### Containment Phase

#### Stop Actions Taken
Immediately paused all scheduled Braze marketing campaigns across affected markets (DE, AT, CH, NL, BE, LU) at 14:30 CET on March 9th to prevent further non-compliant email sends.

#### Prevent Actions Taken
Created manual process: Customer Care team maintains temporary spreadsheet of all unsubscribe requests received since March 7th. Marketing team checks this list before any urgent campaign sends (e.g., flash sales).

#### Limit Actions Taken
Configured Braze to route all new unsubscribe requests through backup webhook endpoint pointing to legacy system. Processing time increased from 2 minutes to ~15 minutes but ensures requests are captured.

---

### Next Steps

Root cause analysis scheduled with Engineering team for March 10th. Backend team investigating API gateway logs to identify why webhook started failing. DPO preparing breach notification assessment (72-hour deadline: March 10th 08:00 CET).

---

