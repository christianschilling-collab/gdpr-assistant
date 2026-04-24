import { Incident, IncidentTask, IncidentAuditLog } from '@/lib/types';
import { formatIncidentScenarioLabelsEn } from '@/lib/constants/incidentScenarioTags';

function notificationDecisionLabel(v: Incident['notificationDecision']): string {
  if (!v) return '';
  if (v === 'notify_authority') return 'Supervisory authority must be notified';
  if (v === 'no_action') return 'No authority notification required';
  return 'Under review';
}

/**
 * Generate CSV export for incident (technical backup)
 */
export function generateIncidentCSV(
  incident: Incident,
  tasks: IncidentTask[],
  auditLog: IncidentAuditLog[]
): string {
  const rows: string[][] = [];
  
  // Helper to format dates in readable format
  const formatDate = (date: Date) => {
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Helper to clean multi-line text for CSV
  const cleanText = (text: string) => {
    return text.replace(/[\r\n]+/g, ' | ').substring(0, 500);
  };
  
  // Header
  rows.push(['GDPR Incident Report - Technical Backup']);
  rows.push(['Generated', formatDate(new Date())]);
  rows.push([]);
  
  // Incident Details
  rows.push(['INCIDENT DETAILS']);
  rows.push(['Incident ID', incident.incidentId]);
  rows.push(['Status', incident.status]);
  rows.push(['Risk Level', incident.riskAssessment || 'Not assessed']);
  rows.push([
    'Intake scenario',
    formatIncidentScenarioLabelsEn(incident.scenarioTags) || 'Not specified',
  ]);
  if (incident.affectedMarkets?.length) {
    rows.push(['Affected markets / regions', incident.affectedMarkets.join('; ')]);
  }
  rows.push([
    'Legal breach characterisation (CIA)',
    incident.breachTypes?.length
      ? incident.breachTypes.join('; ')
      : incident.primaryLegalRisk || 'Not specified',
  ]);
  rows.push(['Nature', incident.natureOfIncident]);
  if (incident.additionalDescription?.trim()) {
    rows.push(['Additional intake notes', cleanText(incident.additionalDescription)]);
  }
  if (incident.breachOtherDetails?.trim()) {
    rows.push(['Breach other details', cleanText(incident.breachOtherDetails)]);
  }
  rows.push(['Affected Systems', incident.affectedSystems.join('; ')]);
  if (incident.dataCategories?.length) {
    rows.push(['Data categories', incident.dataCategories.join('; ')]);
  }
  rows.push(['Discovery Date', formatDate(incident.discoveryDate)]);
  rows.push(['Impact Start', formatDate(incident.impactPeriod.start)]);
  rows.push(['Impact End', incident.impactPeriod.end ? formatDate(incident.impactPeriod.end) : 'Ongoing']);
  rows.push(['Total Impacted', (incident.totalImpacted ?? 0).toString()]);
  if (incident.notificationDecision) {
    rows.push(['Authority notification decision', notificationDecisionLabel(incident.notificationDecision)]);
  }
  if (incident.legalReasoning?.trim()) {
    rows.push(['Legal reasoning (notification)', cleanText(incident.legalReasoning)]);
  }
  rows.push(['Notification Deadline', incident.notificationDeadline ? formatDate(incident.notificationDeadline) : 'N/A']);
  rows.push(['Created By', incident.createdBy]);
  rows.push(['Created At', formatDate(incident.createdAt)]);
  rows.push([]);
  
  // Country Impact
  rows.push(['COUNTRY IMPACT']);
  rows.push(['Country', 'Volume', 'Complaints', 'Risk Level', 'Breach Type']);
  incident.countryImpact
    .filter(c => c.impactedVolume > 0 || c.complaintsReceived > 0)
    .forEach(c => {
      rows.push([
        c.country,
        c.impactedVolume.toString(),
        c.complaintsReceived.toString(),
        c.riskLevel,
        c.breachType || 'Not specified',
      ]);
    });
  rows.push([]);
  
  // Investigation Details
  if (incident.rootCause || incident.technicalResolution || incident.riskAssessment) {
    rows.push(['INVESTIGATION DETAILS']);
    if (incident.rootCause) rows.push(['Root Cause', cleanText(incident.rootCause)]);
    if (incident.technicalResolution) rows.push(['Technical Resolution', cleanText(incident.technicalResolution)]);
    if (incident.riskAssessment) rows.push(['Risk Assessment', String(incident.riskAssessment)]);
    rows.push([]);
  }
  
  // Containment
  if (incident.containmentMeasures) {
    rows.push(['CONTAINMENT']);
    rows.push(['Measures', cleanText(incident.containmentMeasures)]);
    if (incident.containmentVerified) {
      rows.push(['Verified By', incident.containmentVerifiedBy || 'Unknown']);
      rows.push(['Verified At', incident.containmentVerifiedAt ? formatDate(incident.containmentVerifiedAt) : '']);
    }
    rows.push([]);
  }
  
  // Resolution
  if (incident.resolutionDescription || incident.preventiveMeasures) {
    rows.push(['RESOLUTION']);
    if (incident.resolutionDescription) rows.push(['Description', cleanText(incident.resolutionDescription)]);
    if (incident.preventiveMeasures) rows.push(['Preventive Measures', cleanText(incident.preventiveMeasures)]);
    if (incident.resolutionVerified) {
      rows.push(['Verified By', incident.resolutionVerifiedBy || 'Unknown']);
      rows.push(['Verified At', incident.resolutionVerifiedAt ? formatDate(incident.resolutionVerifiedAt) : '']);
    }
    rows.push([]);
  }
  
  // Tasks
  rows.push(['TASKS']);
  rows.push(['Status', 'Priority', 'Title', 'Owner', 'Due Date', 'Completed At']);
  tasks.forEach(task => {
    rows.push([
      task.status === 'completed' ? 'COMPLETED' : 'PENDING',
      task.priority || 'Medium',
      task.title,
      task.owner,
      task.dueDate ? formatDate(task.dueDate) : 'No deadline',
      task.completedAt ? formatDate(task.completedAt) : '-',
    ]);
  });
  rows.push([]);
  
  // Audit Log (last 50 entries)
  rows.push(['AUDIT LOG (Last 50 entries)']);
  rows.push(['Date & Time', 'User', 'Action', 'Details']);
  auditLog.slice(-50).reverse().forEach(entry => {
    const details = entry.fieldChanged 
      ? `${entry.fieldChanged}: ${entry.oldValue || '(empty)'} → ${entry.newValue || '(empty)'}`
      : entry.action;
    rows.push([
      formatDate(entry.timestamp),
      entry.userEmail,
      entry.action,
      cleanText(details),
    ]);
  });
  
  // Convert to CSV with proper escaping
  return rows.map(row => 
    row.map(cell => {
      const cleaned = String(cell).replace(/"/g, '""'); // Escape quotes
      return `"${cleaned}"`;
    }).join(',')
  ).join('\n');
}

/**
 * Generate PDF export with HelloFresh 2026 Design
 * Uses dynamic imports to avoid SSR issues
 */
export async function generateIncidentPDF(
  incident: Incident,
  tasks: IncidentTask[],
  auditLog: IncidentAuditLog[]
): Promise<void> {
  console.log('📄 PDF Generator started');
  console.log('📊 Incident data:', {
    id: incident.incidentId,
    status: incident.status,
    riskLevel: incident.riskLevel,
    hasRootCause: !!incident.rootCause,
    hasTechnicalResolution: !!incident.technicalResolution,
    hasRiskAssessment: !!incident.riskAssessment,
    hasContainmentMeasures: !!incident.containmentMeasures,
    hasResolutionDescription: !!incident.resolutionDescription,
    tasksCount: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
  });
  
  try {
    console.log('⬇️ Loading jsPDF...');
    // Dynamic imports
    const jsPDF = (await import('jspdf')).default;
    console.log('✅ jsPDF loaded');
    
    console.log('⬇️ Loading autoTable...');
    const autoTable = (await import('jspdf-autotable')).default;
    console.log('✅ autoTable loaded');
    
    console.log('📝 Creating PDF document...');
    const doc = new jsPDF();
    console.log('✅ PDF document created');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;
    
    // HelloFresh Brand Colors (2026)
    const hfGreen: [number, number, number] = [83, 192, 128]; // #53C080
    const hfOrange: [number, number, number] = [255, 109, 0]; // #FF6D00
    const darkGray: [number, number, number] = [51, 51, 51];
    const lightGray: [number, number, number] = [245, 245, 245];
    
    // Header with HelloFresh branding
    doc.setFillColor(...hfGreen);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('HelloFresh', margin, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('GDPR Incident Report', margin, 28);
    
    yPos = 50;
    
    // Incident ID and Status Badge
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(incident.incidentId || 'Unknown', margin, yPos);
    
    // Status badge
    const statusX = pageWidth - margin - 40;
    const statusColors: Record<string, [number, number, number]> = {
      'Reporting': [255, 193, 7],
      'Investigation': [33, 150, 243],
      'Containment': [255, 152, 0],
      'Resolution': [76, 175, 80],
      'Post-Incident Review': [156, 39, 176],
      'Closed': [158, 158, 158],
    };
    const statusColor = statusColors[incident.status] || [158, 158, 158];
    doc.setFillColor(...statusColor);
    doc.roundedRect(statusX, yPos - 8, 40, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const statusText = incident.status || 'Unknown';
    // Truncate if too long
    const displayStatus = statusText.length > 10 ? statusText.substring(0, 9) + '...' : statusText;
    doc.text(displayStatus, statusX + 20, yPos, { align: 'center' });
    
    yPos += 15;
    
    // Risk Level - use riskAssessment field
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Risk Level: `, margin, yPos);
    
    if (incident.riskAssessment) {
      const riskColor: [number, number, number] = incident.riskAssessment === 'High' ? [244, 67, 54] :
                        incident.riskAssessment === 'Medium' ? [255, 152, 0] : [76, 175, 80];
      doc.setTextColor(...riskColor);
      doc.setFont('helvetica', 'bold');
      doc.text(incident.riskAssessment, margin + 25, yPos);
    } else {
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Not assessed', margin + 25, yPos);
    }
    
    // Breach characterisation — prefer multi-select from intake, else legacy field
    const breachTypeX = pageWidth / 2 + 10;
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Intake: `, breachTypeX, yPos);

    const intakeLabel = formatIncidentScenarioLabelsEn(incident.scenarioTags);
    if (intakeLabel) {
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      const truncated =
        intakeLabel.length > 42 ? `${intakeLabel.slice(0, 40)}…` : intakeLabel;
      doc.text(truncated, breachTypeX + 22, yPos);
    } else {
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Not specified', breachTypeX + 22, yPos);
    }

    yPos += 10;
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Legal (CIA): `, breachTypeX, yPos);
    const breachLabel =
      incident.breachTypes?.length
        ? incident.breachTypes.map((b) => b.replace('Loss of ', '')).join(', ')
        : incident.primaryLegalRisk || '';
    doc.setFont('helvetica', 'bold');
    doc.text(
      breachLabel
        ? breachLabel.length > 48
          ? `${breachLabel.slice(0, 46)}…`
          : breachLabel
        : 'Not recorded',
      breachTypeX + 32,
      yPos
    );

    yPos += 10;
    
    // Executive Summary Section
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(...hfGreen);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin + 2, yPos + 6);
    yPos += 15;
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryItems: Array<[string, string]> = [
      ['Nature of Incident', incident.natureOfIncident || 'Not specified'],
    ];
    if (incident.additionalDescription?.trim()) {
      summaryItems.push(['Further details (intake)', incident.additionalDescription.trim()]);
    }
    if (incident.affectedMarkets?.length) {
      summaryItems.push(['Affected markets / regions', incident.affectedMarkets.join(', ')]);
    }
    if (formatIncidentScenarioLabelsEn(incident.scenarioTags)) {
      summaryItems.push([
        'Intake scenario',
        formatIncidentScenarioLabelsEn(incident.scenarioTags),
      ]);
    }
    if (incident.breachOtherDetails?.trim()) {
      summaryItems.push(['Breach “other” details', incident.breachOtherDetails.trim()]);
    }
    if (incident.notificationDecision) {
      summaryItems.push([
        'Authority notification decision',
        notificationDecisionLabel(incident.notificationDecision),
      ]);
    }
    if (incident.legalReasoning?.trim()) {
      summaryItems.push(['Legal reasoning', incident.legalReasoning.trim()]);
    }
    summaryItems.push(
      ['Affected Systems', incident.affectedSystems?.length > 0 ? incident.affectedSystems.join(', ') : 'None specified'],
      ['Discovery Date', incident.discoveryDate?.toLocaleDateString() || 'Unknown'],
      ['Impact Period', `${incident.impactPeriod?.start?.toLocaleDateString() || 'Unknown'} - ${incident.impactPeriod?.end?.toLocaleDateString() || 'Ongoing'}`],
      ['Total Impacted', incident.totalImpacted?.toLocaleString() || '0'],
    );
    
    summaryItems.forEach(([label, value]) => {
      if (label && value) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin + 2, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), margin + 50, yPos);
        yPos += 7;
      }
    });
    
    yPos += 5;
    
    // Country Impact Table
    const impactedCountries = incident.countryImpact.filter(c => c.impactedVolume > 0 || c.complaintsReceived > 0);
    if (impactedCountries.length > 0) {
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...hfGreen);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Country Impact', margin + 2, yPos + 6);
      yPos += 12;
      
      const countryData = impactedCountries.map(c => [
        c.country,
        c.impactedVolume.toLocaleString(),
        c.complaintsReceived.toString(),
        c.riskLevel,
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Country', 'Volume', 'Complaints', 'Risk']],
        body: countryData,
        theme: 'grid',
        headStyles: { fillColor: hfGreen, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Investigation Details (if available)
    if (incident.rootCause || incident.technicalResolution || incident.riskAssessment) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...hfGreen);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Investigation Details', margin + 2, yPos + 6);
      yPos += 15;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      
      if (incident.rootCause && incident.rootCause.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.text('Root Cause:', margin + 2, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const rootCauseLines = doc.splitTextToSize(incident.rootCause, pageWidth - 2 * margin - 4);
        doc.text(rootCauseLines, margin + 2, yPos);
        yPos += rootCauseLines.length * 5 + 5;
      }
      
      if (incident.technicalResolution && incident.technicalResolution.trim()) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Technical Resolution:', margin + 2, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const techLines = doc.splitTextToSize(incident.technicalResolution, pageWidth - 2 * margin - 4);
        doc.text(techLines, margin + 2, yPos);
        yPos += techLines.length * 5 + 5;
      }
      
      if (incident.riskAssessment && incident.riskAssessment.trim()) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Risk Assessment:', margin + 2, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const riskLines = doc.splitTextToSize(String(incident.riskAssessment), pageWidth - 2 * margin - 4);
        doc.text(riskLines, margin + 2, yPos);
        yPos += riskLines.length * 5 + 5;
      }
    }
    
    // Containment Section (if available)
    if (incident.containmentMeasures && incident.containmentMeasures.trim()) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...hfGreen);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Containment', margin + 2, yPos + 6);
      yPos += 15;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const containmentLines = doc.splitTextToSize(incident.containmentMeasures, pageWidth - 2 * margin - 4);
      doc.text(containmentLines, margin + 2, yPos);
      yPos += containmentLines.length * 5 + 5;
      
      if (incident.containmentVerified) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Verified by: ${incident.containmentVerifiedBy || 'Unknown'}`, margin + 2, yPos);
        yPos += 6;
      }
    }
    
    // Resolution Section (if available)
    if (incident.resolutionDescription || incident.preventiveMeasures) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...hfGreen);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resolution', margin + 2, yPos + 6);
      yPos += 15;
      
      doc.setTextColor(...darkGray);
      doc.setFontSize(10);
      
      if (incident.resolutionDescription && incident.resolutionDescription.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.text('Resolution Description:', margin + 2, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const resolutionLines = doc.splitTextToSize(incident.resolutionDescription, pageWidth - 2 * margin - 4);
        doc.text(resolutionLines, margin + 2, yPos);
        yPos += resolutionLines.length * 5 + 5;
      }
      
      if (incident.preventiveMeasures && incident.preventiveMeasures.trim()) {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Preventive Measures:', margin + 2, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        const preventiveLines = doc.splitTextToSize(incident.preventiveMeasures, pageWidth - 2 * margin - 4);
        doc.text(preventiveLines, margin + 2, yPos);
        yPos += preventiveLines.length * 5 + 5;
      }
      
      if (incident.resolutionVerified) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Verified by: ${incident.resolutionVerifiedBy || 'Unknown'}`, margin + 2, yPos);
        yPos += 6;
      }
    }
    
    // Tasks Section
    if (tasks && tasks.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(...hfGreen);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Action Plan', margin + 2, yPos + 6);
      yPos += 12;
      
      const taskData = tasks.slice(0, 20).map(t => [
        (t.title || 'Untitled task').substring(0, 50),
        t.status === 'completed' ? '[X]' : '[ ]',
        t.priority || 'Medium',
        (t.owner || 'Unassigned').split('@')[0],
        t.status === 'completed' && t.completedAt 
          ? t.completedAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
          : '-',
      ]);
      
      autoTable(doc, {
        startY: yPos,
        head: [['Task', '✓', 'Priority', 'Owner', 'Completed']],
        body: taskData,
        theme: 'grid',
        headStyles: { fillColor: hfGreen, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25, halign: 'center', fontSize: 7 },
        },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    console.log('💾 Saving PDF...');
    const filename = `${incident.incidentId}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    console.log('✅ PDF saved successfully:', filename);
  } catch (error) {
    console.error('❌ PDF Generation Error:', error);
    console.error('Error type:', typeof error);
    console.error('Error instanceof Error:', error instanceof Error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger browser download for CSV
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
