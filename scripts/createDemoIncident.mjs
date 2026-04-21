/**
 * Demo Incident Creator - Legt einen vollständigen Test-Incident an für Präsentation
 * Run: node scripts/createDemoIncident.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase Config (aus .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createDemoIncident() {
  console.log('🚀 Creating comprehensive demo incident...');
  
  const incidentId = `INC-2026-DEMO-${Date.now()}`;
  const now = new Date();
  const discoveryDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago
  
  // Main Incident Document
  const incident = {
    id: incidentId,
    incidentId: incidentId,
    
    // Executive Summary
    natureOfIncident: 'Unauthorized access to customer database via SQL injection vulnerability',
    affectedSystems: ['CRM', 'Payment System', 'Email Platform', 'Customer Portal'],
    impactPeriod: {
      start: Timestamp.fromDate(new Date(discoveryDate.getTime() - 24 * 60 * 60 * 1000)),
      end: Timestamp.fromDate(new Date(discoveryDate.getTime() + 6 * 60 * 60 * 1000)),
    },
    discoveryDate: Timestamp.fromDate(discoveryDate),
    
    // Investigation Details
    rootCause: `SQL injection vulnerability in legacy customer search API endpoint (/api/v1/customers/search). The vulnerability was introduced during a refactoring in Q2 2025 when input sanitization was accidentally removed from the search parameter. An automated security scan by an external party discovered and exploited this vulnerability to access customer records.

Technical Analysis:
- Vulnerable endpoint: GET /api/v1/customers/search?query=[UNSANITIZED_INPUT]
- Attack vector: Union-based SQL injection
- Duration of exposure: Approximately 8 months (June 2025 - February 2026)
- Access logs show 127 unauthorized queries between Feb 10-12, 2026`,
    
    technicalResolution: `Immediate Actions Taken:
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
- Enhanced developer security training program`,
    
    riskAssessment: 'High',
    
    // Impact Analysis
    primaryLegalRisk: 'Loss of Confidentiality',
    countryImpact: [
      {
        country: 'DE',
        impactedVolume: 12500,
        complaintsReceived: 45,
        riskLevel: 'High',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
      {
        country: 'AT',
        impactedVolume: 3200,
        complaintsReceived: 12,
        riskLevel: 'High',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
      {
        country: 'CH',
        impactedVolume: 2100,
        complaintsReceived: 8,
        riskLevel: 'Medium',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
      {
        country: 'BE',
        impactedVolume: 8900,
        complaintsReceived: 28,
        riskLevel: 'High',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
      {
        country: 'NL',
        impactedVolume: 15600,
        complaintsReceived: 52,
        riskLevel: 'High',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
      {
        country: 'SE',
        impactedVolume: 4300,
        complaintsReceived: 15,
        riskLevel: 'Medium',
        breachType: 'Loss of Confidentiality',
        legalRisk: 'Loss of Confidentiality',
      },
    ],
    totalImpacted: 46600,
    
    // Containment
    containmentMeasures: `Immediate Containment (within 2 hours of discovery):
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

Verification completed by Security Team on ${new Date(discoveryDate.getTime() + 30 * 60 * 60 * 1000).toLocaleDateString()} with full penetration test confirming vulnerability closure.`,
    
    containmentVerified: true,
    containmentVerifiedBy: 'security.team@hellofresh.com',
    containmentVerifiedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 30 * 60 * 60 * 1000)),
    
    // Resolution
    resolutionDescription: `Complete resolution achieved through multi-layered approach:

Technical Resolution:
- All vulnerable code paths identified and patched (23 endpoints total)
- Comprehensive security audit completed across entire codebase
- Enhanced input validation framework deployed organization-wide
- Database access layer completely rewritten with security best practices
- Automated security scanning integrated into deployment pipeline

Customer Impact Mitigation:
- Direct email notification sent to all 46,600 affected customers
- Dedicated support hotline established (received 892 calls, avg wait time <2 min)
- 12 months of free credit monitoring service offered to all affected customers
- Transparent incident report published on corporate website
- Town hall meeting held with customer advocacy groups

System Improvements:
- Migrated to modern ORM framework with built-in SQL injection protection
- Implemented API gateway with built-in security features
- Enhanced monitoring with real-time alerts for suspicious patterns
- Regular security training now mandatory for all engineering staff`,
    
    preventiveMeasures: `Organizational Changes:
1. Established dedicated Application Security team (5 full-time engineers)
2. Implemented mandatory security code review for all database interactions
3. Quarterly penetration testing by external security firm
4. Monthly security champions meetings across engineering teams
5. Updated incident response playbook based on lessons learned

Technical Safeguards:
1. Deployed Web Application Firewall (WAF) with OWASP ruleset
2. Implemented automated SAST/DAST in CI/CD pipeline (blocks deployment on critical findings)
3. Database activity monitoring with ML-based anomaly detection
4. Zero-trust architecture for all internal API communications
5. API rate limiting and request validation at infrastructure level

Process Improvements:
1. Security design review required for all new features
2. Bi-annual security training for all technical staff
3. Bug bounty program launched with HackerOne
4. Regular security awareness campaigns for entire organization
5. Established clear escalation paths for security incidents

Compliance Enhancements:
1. Enhanced data protection impact assessment (DPIA) process
2. Regular audits of data access patterns
3. Improved documentation of all customer data processing activities
4. Strengthened vendor security assessment procedures
5. Updated data breach notification procedures for faster response`,
    
    resolutionVerified: true,
    resolutionVerifiedBy: 'legal.team@hellofresh.com',
    resolutionVerifiedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 120 * 60 * 60 * 1000)),
    
    // Additional fields
    workaroundCS: 'Customer Service provided affected customers with direct support line and expedited request processing. All affected accounts flagged for priority handling.',
    legalReasoning: 'DPA notification required under GDPR Art. 33 due to high risk to rights and freedoms of data subjects. Notification completed to all relevant supervisory authorities within 72 hours. Individual notification under Art. 34 also required due to high-risk nature.',
    notificationDecision: 'Authority Notification Required',
    
    // Workflow
    status: 'Closed',
    assignedTo: 'incident.response@hellofresh.com',
    
    // Timestamps
    createdAt: Timestamp.fromDate(discoveryDate),
    updatedAt: Timestamp.fromDate(now),
    createdBy: 'demo.admin@hellofresh.com',
    
    // Compliance
    notificationDeadline: Timestamp.fromDate(new Date(discoveryDate.getTime() + 72 * 60 * 60 * 1000)),
    authorityNotifiedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 68 * 60 * 60 * 1000)),
  };
  
  console.log('📝 Creating incident document...');
  await setDoc(doc(db, 'incidents', incidentId), incident);
  console.log('✅ Incident created:', incidentId);
  
  // Create Tasks
  const tasks = [
    {
      title: 'Assess impact and gather initial information',
      description: 'Collect all available information about the breach, affected systems, and preliminary impact assessment.',
      owner: 'security.lead@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 2 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 1.5 * 60 * 60 * 1000)),
    },
    {
      title: 'Determine if DPA notification required',
      description: 'Legal review to determine if breach meets threshold for data protection authority notification under GDPR Art. 33.',
      owner: 'legal.team@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 24 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 20 * 60 * 60 * 1000)),
      externalLinks: [
        { label: 'GDPR Art. 33 Guidelines', url: 'https://gdpr-info.eu/art-33-gdpr/' },
      ],
    },
    {
      title: 'Document root cause analysis',
      description: 'Complete technical analysis of vulnerability, attack vector, and timeline of exploitation.',
      owner: 'tech.lead@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 48 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 36 * 60 * 60 * 1000)),
      externalLinks: [
        { label: 'Root Cause Template', url: 'https://confluence.hellofresh.com/security/rca-template' },
        { label: 'Security Incident JIRA', url: 'https://jira.hellofresh.com/browse/SEC-1234' },
      ],
    },
    {
      title: 'Implement containment measures',
      description: 'Deploy emergency patches, isolate affected systems, and implement monitoring.',
      owner: 'security.lead@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 4 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 3 * 60 * 60 * 1000)),
    },
    {
      title: 'Verify containment effectiveness',
      description: 'Conduct penetration testing to confirm vulnerability is fully patched and no additional attack vectors exist.',
      owner: 'security.team@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 30 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 28 * 60 * 60 * 1000)),
    },
    {
      title: 'Notify Data Protection Authorities',
      description: 'Submit formal notifications to all relevant DPAs (DE, AT, BE, NL, SE supervisory authorities).',
      owner: 'legal.team@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 72 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 68 * 60 * 60 * 1000)),
      externalLinks: [
        { label: 'DPA Notification Form', url: 'https://edpb.europa.eu/data-breach-notification_en' },
      ],
    },
    {
      title: 'Send individual notifications to affected customers',
      description: 'Draft and send GDPR Art. 34 notifications to all 46,600 affected customers.',
      owner: 'communications.team@hellofresh.com',
      status: 'completed',
      priority: 'High',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 72 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 70 * 60 * 60 * 1000)),
    },
    {
      title: 'Implement preventive measures',
      description: 'Deploy long-term security improvements including WAF, code scanning, and enhanced monitoring.',
      owner: 'tech.lead@hellofresh.com',
      status: 'completed',
      priority: 'Medium',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 168 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 160 * 60 * 60 * 1000)),
    },
    {
      title: 'Conduct post-incident review',
      description: 'Hold retrospective with all stakeholders to document lessons learned and update incident response procedures.',
      owner: 'incident.response@hellofresh.com',
      status: 'completed',
      priority: 'Medium',
      dueDate: Timestamp.fromDate(new Date(discoveryDate.getTime() + 240 * 60 * 60 * 1000)),
      completedAt: Timestamp.fromDate(new Date(discoveryDate.getTime() + 235 * 60 * 60 * 1000)),
      externalLinks: [
        { label: 'Post-Incident Report', url: 'https://confluence.hellofresh.com/security/pir-2026-demo' },
      ],
    },
  ];
  
  console.log('📋 Creating tasks...');
  for (let i = 0; i < tasks.length; i++) {
    const taskId = `${incidentId}-task-${i + 1}`;
    await setDoc(doc(db, 'incidentTasks', taskId), {
      id: taskId,
      incidentId: incidentId,
      ...tasks[i],
      createdAt: Timestamp.fromDate(discoveryDate),
    });
  }
  console.log(`✅ Created ${tasks.length} tasks`);
  
  // Create Audit Log Entries
  const auditEntries = [
    {
      action: 'Incident created',
      userEmail: 'demo.admin@hellofresh.com',
      timestamp: Timestamp.fromDate(discoveryDate),
    },
    {
      action: 'Status changed',
      fieldChanged: 'status',
      oldValue: 'Reporting',
      newValue: 'Investigation',
      userEmail: 'security.lead@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 2 * 60 * 60 * 1000)),
    },
    {
      action: 'Field updated',
      fieldChanged: 'rootCause',
      oldValue: '',
      newValue: 'SQL injection vulnerability discovered',
      userEmail: 'tech.lead@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 12 * 60 * 60 * 1000)),
    },
    {
      action: 'Status changed',
      fieldChanged: 'status',
      oldValue: 'Investigation',
      newValue: 'Containment',
      userEmail: 'security.lead@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 24 * 60 * 60 * 1000)),
    },
    {
      action: 'Field updated',
      fieldChanged: 'containmentMeasures',
      oldValue: '',
      newValue: 'Emergency patches deployed',
      userEmail: 'security.team@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 30 * 60 * 60 * 1000)),
    },
    {
      action: 'Status changed',
      fieldChanged: 'status',
      oldValue: 'Containment',
      newValue: 'Resolution',
      userEmail: 'incident.response@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 72 * 60 * 60 * 1000)),
    },
    {
      action: 'Field updated',
      fieldChanged: 'resolutionDescription',
      oldValue: '',
      newValue: 'Complete resolution with long-term improvements',
      userEmail: 'tech.lead@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 120 * 60 * 60 * 1000)),
    },
    {
      action: 'Status changed',
      fieldChanged: 'status',
      oldValue: 'Resolution',
      newValue: 'Post-Incident Review',
      userEmail: 'incident.response@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 200 * 60 * 60 * 1000)),
    },
    {
      action: 'Status changed',
      fieldChanged: 'status',
      oldValue: 'Post-Incident Review',
      newValue: 'Closed',
      userEmail: 'legal.team@hellofresh.com',
      timestamp: Timestamp.fromDate(new Date(discoveryDate.getTime() + 240 * 60 * 60 * 1000)),
    },
  ];
  
  console.log('📜 Creating audit log entries...');
  for (let i = 0; i < auditEntries.length; i++) {
    const auditId = `${incidentId}-audit-${i + 1}`;
    await setDoc(doc(db, 'incidentAuditLog', auditId), {
      id: auditId,
      incidentId: incidentId,
      userId: auditEntries[i].userEmail,
      ...auditEntries[i],
    });
  }
  console.log(`✅ Created ${auditEntries.length} audit log entries`);
  
  console.log('\n🎉 Demo incident successfully created!');
  console.log(`📍 Incident ID: ${incidentId}`);
  console.log(`🔗 View at: http://localhost:3001/incidents/${incidentId}`);
  console.log('\n💡 This incident includes:');
  console.log('   ✓ Complete investigation with root cause analysis');
  console.log('   ✓ Detailed containment measures (verified)');
  console.log('   ✓ Comprehensive resolution with preventive measures');
  console.log('   ✓ Multi-country impact (DE, AT, CH, BE, NL, SE)');
  console.log('   ✓ 9 completed tasks with external links');
  console.log('   ✓ Complete audit trail with 9 entries');
  console.log('   ✓ Ready for PDF export demo!');
}

createDemoIncident()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error creating demo incident:', error);
    process.exit(1);
  });
