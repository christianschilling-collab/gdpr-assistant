import type { WeeklyReport, ActivityLogEntry } from "@/lib/types";
import { ACTIVITY_KIND_LABELS } from "@/lib/types";
import {
  resolveActivityKind,
  isActivityLowlightKind,
  formatActivityEntryPlainText,
  displayMarketLabel,
} from "@/lib/reporting/activityLogKinds";
import type { TrainingReport } from "@/lib/types/training";
import type { MarketDeepDive } from "@/lib/types/marketDeepDive";
import { getMarketStatusData, formatMonthDisplay } from "@/lib/reporting/reportMetrics";

function translateErrorDescription(germanText: string): string {
  const mappings: Record<string, string> = {
    // Main categories (exact matches)
    'Werbewiderruf: Präferenzen im Kundenkonto nicht deaktiviert': 'Marketing Opt-Out: Preferences not deactivated in customer account',
    'Allg. Ticketfehler: Falsche Kategorie gewählt': 'General Ticket Error: Wrong category selected',
    'Falsche Länder-Angabe im Ticket (DE/CH/AT)': 'Wrong country specified in ticket (DE/CH/AT)',
    'Ticket unvollständig (z.B. Kundennummer fehlt)': 'Incomplete ticket (e.g., customer number missing)',
    'Data Deletion/Removal - Konto wurde nicht gekündigt': 'Data Deletion/Removal: Account not cancelled',
    'Kunden-Verifikation angefordert anstelle Data-Privacy-Anliegen per Jira-Ticket zu eskalieren': 'Customer verification requested instead of escalating data privacy issue via Jira',
    'Sonstige falsche Bearbeitung (bitte im Kommentar ergänzen)': 'Other incorrect processing (see notes)',
    
    // Partial matches (fallback)
    'Werbewiderruf': 'Marketing Opt-Out',
    'Präferenzen': 'Preferences not deactivated',
    'Falsche Kategorie': 'Wrong category selected',
    'Falsche Länder': 'Wrong country specified',
    'Ticket unvollständig': 'Incomplete ticket',
    'Datenlöschung': 'Data Deletion',
    'Konto nicht gekündigt': 'Account not cancelled',
    'Verifikation': 'Customer verification issue',
    'Sonstige': 'Other',
  };
  
  // Try exact match first
  if (mappings[germanText]) {
    return mappings[germanText];
  }
  
  // Try partial matches
  for (const [german, english] of Object.entries(mappings)) {
    if (germanText.includes(german)) {
      return english;
    }
  }
  
  // Return original if no match (already in English or new category)
  return germanText;
}

function gdprReportSumDeletions(dive: MarketDeepDive | null): number {
  if (!dive?.markets) return 0;
  return Object.values(dive.markets).reduce((s, m) => s + (m?.deletionRequests || 0), 0);
}

function gdprReportSumAccess(dive: MarketDeepDive | null): number {
  if (!dive?.markets) return 0;
  return Object.values(dive.markets).reduce((s, m) => s + (m?.dsarRequests || 0), 0);
}

function gdprReportIssuesCount(dive: MarketDeepDive | null): number {
  return dive?.significantIncidents?.length ?? 0;
}

/** Large colored MoM delta + small “n this month” for executive strip */
function gdprExecMomHtml(cur: number, prev: number, hasPrev: boolean): string {
  if (!hasPrev) {
    return `<span style="font-size:11px;color:#9ca3af;">No prior month snapshot</span>`;
  }
  const d = cur - prev;
  const color = d > 0 ? '#dc2626' : d < 0 ? '#16a34a' : '#6b7280';
  const sign = d > 0 ? '+' : '';
  return `<span style="font-size:22px;font-weight:800;color:${color};line-height:1.1;">${sign}${d}</span><span style="display:block;font-size:10px;color:#9ca3af;margin-top:4px;font-weight:500;">${cur} this month</span>`;
}

function gdprTableCellMomHtml(cur: number, prev: number, hasPrev: boolean): string {
  if (!hasPrev) return `${cur}`;
  const d = cur - prev;
  const color = d > 0 ? '#dc2626' : d < 0 ? '#16a34a' : '#9ca3af';
  const sign = d > 0 ? '+' : '';
  return `${cur}<span style="display:block;font-size:11px;font-weight:700;color:${color};margin-top:3px;">Δ ${sign}${d}</span>`;
}

function escHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateMonthlySummaryHTML(
  current: any,
  previous: any,
  highlights: any,
  selectedMonth: string,
  reports: WeeklyReport[],
  activityLog: ActivityLogEntry[],
  trainingReport: TrainingReport | null,
  marketDeepDive: MarketDeepDive | null,
  previousMarketDeepDive: MarketDeepDive | null
): string {
  const monthName = formatMonthDisplay(selectedMonth);

  const marketStatusData = getMarketStatusData(reports);

  const curDel = marketDeepDive ? gdprReportSumDeletions(marketDeepDive) : current.totalDeletionRequests;
  const prevDel = marketDeepDive
    ? gdprReportSumDeletions(previousMarketDeepDive)
    : (previous?.totalDeletionRequests ?? 0);

  const curAccess = marketDeepDive ? gdprReportSumAccess(marketDeepDive) : current.totalPortabilityRequests;
  const prevAccess = marketDeepDive
    ? gdprReportSumAccess(previousMarketDeepDive)
    : (previous?.totalPortabilityRequests ?? 0);

  const curIssues = marketDeepDive ? gdprReportIssuesCount(marketDeepDive) : 0;
  const prevIssues = marketDeepDive ? gdprReportIssuesCount(previousMarketDeepDive) : 0;

  const hasPrevForMom = marketDeepDive ? !!previousMarketDeepDive : previous != null;

  const delMom = hasPrevForMom ? curDel - prevDel : 0;
  const accMom = hasPrevForMom ? curAccess - prevAccess : 0;
  const issMom = hasPrevForMom ? curIssues - prevIssues : 0;
  const preheaderRaw = `${monthName}: deletions ${delMom >= 0 ? '+' : ''}${delMom} MoM, access ${accMom >= 0 ? '+' : ''}${accMom} MoM, incidents ${issMom >= 0 ? '+' : ''}${issMom} MoM (${curIssues} open). HelloFresh GDPR — DACH, FR, BNL, Nordics.`;
  const preheaderEsc = escHtml(preheaderRaw.length > 115 ? `${preheaderRaw.slice(0, 112)}...` : preheaderRaw);

  const marketOrder = ['DACH', 'Fr', 'BNL', 'Nordics'] as const;

  const deepDiveMarketRows = marketDeepDive
    ? marketOrder
        .map((market, rowIdx) => {
          const data = marketDeepDive.markets[market as keyof typeof marketDeepDive.markets];
          if (!data) return '';

          const prevM = previousMarketDeepDive?.markets?.[market as keyof typeof marketDeepDive.markets];
          const del = data.deletionRequests || 0;
          const delP = prevM?.deletionRequests || 0;
          const acc = data.dsarRequests || 0;
          const accP = prevM?.dsarRequests || 0;
          const esc = data.escalations || 0;
          const escP = prevM?.escalations || 0;
          const hasRowPrev = !!previousMarketDeepDive;

          const marketStatus = marketStatusData.find(m => {
            if (market === 'Fr') return m.market === 'France';
            if (market === 'BNL') return m.market === 'BNL';
            return m.market === market;
          });

          const statusEmoji =
            marketStatus?.status === 'green'
              ? '🟢'
              : marketStatus?.status === 'yellow'
                ? '🟡'
                : marketStatus?.status === 'red'
                  ? '🔴'
                  : '—';

          const rowBg = rowIdx % 2 === 1 ? 'background:#fafafa;' : '';
          const marketLabel = market === 'Fr' ? 'France' : market;

          return `
      <tr style="${rowBg}">
        <td style="padding: 12px 14px; vertical-align: middle;">
          <strong style="font-size:14px;color:#111827;letter-spacing:-0.01em;">${marketLabel}</strong>
        </td>
        <td style="text-align: center; padding: 12px 14px; vertical-align: middle;">${gdprTableCellMomHtml(del, delP, hasRowPrev)}</td>
        <td style="text-align: center; padding: 12px 14px; vertical-align: middle;">${gdprTableCellMomHtml(acc, accP, hasRowPrev)}</td>
        <td style="text-align: center; padding: 12px 14px; vertical-align: middle;">${gdprTableCellMomHtml(esc, escP, hasRowPrev)}</td>
        <td style="text-align: center; padding: 12px 14px; font-size: 20px; vertical-align: middle;">${statusEmoji}</td>
      </tr>`;
        })
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="format-detection" content="telephone=no">
  <title>${escHtml(`GDPR Report — ${monthName}`)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.55; color: #1f2937; margin: 0; padding: 0; background: #eef2f7; -webkit-font-smoothing: antialiased; }
    .container { max-width: 640px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); }
    .header { background: linear-gradient(135deg, #5a9c2e 0%, #7FB838 42%, #8dc63f 100%); color: #ffffff; padding: 28px 28px 26px; }
    .header-kicker { margin: 0 0 6px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.92; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 13px; font-weight: 500; }
    .executive-summary { background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 18px 22px; margin: 0; border-bottom: 1px solid #e2e8f0; }
    .executive-summary h2 { margin: 0 0 14px 0; font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; }
    .metric-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 8px; display: block; }
    .section { background: #ffffff; padding: 22px 26px; border-bottom: 1px solid #e5e7eb; }
    .section h2 { margin: 0 0 14px 0; font-size: 17px; color: #0f172a; font-weight: 800; letter-spacing: -0.02em; padding-bottom: 10px; border-bottom: 3px solid #7FB838; display: block; }
    .section h3 { margin: 14px 0 8px 0; font-size: 14px; color: #334155; font-weight: 700; }
    .section p { margin: 0; color: #475569; font-size: 14px; line-height: 1.65; }
    .snapshot-wrap { margin-top: 4px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
    table.data-table { width: 100%; border-collapse: collapse; margin: 0; background: white; }
    .data-table th { background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 800; color: #475569; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.08em; }
    .data-table td { padding: 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
    .info-box { background: #f8fafc; border-left: 4px solid #94a3b8; padding: 12px 16px; margin: 10px 0; border-radius: 0 6px 6px 0; }
    .risk-box { background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%); border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .escalation-box { background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%); border-left: 4px solid #ef4444; padding: 12px 16px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .win-box { background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 55%, #f8fafc 100%); border-left: 4px solid #22c55e; padding: 12px 16px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .init-box { background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%); border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 10px 0; border-radius: 0 8px 8px 0; }
    .incident-card { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 0; margin: 12px 0; overflow: hidden; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.12); }
    .incident-card-hd { background: linear-gradient(90deg, #fef3c7 0%, #fff7ed 100%); padding: 12px 16px; border-bottom: 1px solid #fde68a; }
    .incident-badge { display: inline-block; min-width: 28px; text-align: center; background: #b45309; color: #fff; font-size: 12px; font-weight: 800; padding: 4px 8px; border-radius: 6px; margin-right: 10px; vertical-align: middle; }
    .incident-title { font-weight: 700; font-size: 14px; color: #78350f; margin: 0; display: inline; vertical-align: middle; line-height: 1.35; }
    .incident-body { padding: 14px 16px 16px; background: #ffffff; }
    .incident-list { margin: 0; padding-left: 18px; font-size: 13px; color: #57534e; line-height: 1.55; }
    .incident-list li { margin: 6px 0; }
    ul { margin: 6px 0; padding-left: 18px; }
    li { margin: 5px 0; color: #4b5563; font-size: 13px; line-height: 1.5; }
    .market-tag { display: inline-block; background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 6px; }
    .footer { background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); padding: 22px 26px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
    .footer-cta { display: inline-block; margin: 12px 0 4px; padding: 10px 22px; background: #7FB838; color: #ffffff !important; font-weight: 700; font-size: 13px; text-decoration: none; border-radius: 8px; letter-spacing: 0.02em; }
    .footer a.footer-link { color: #5a9c2e; text-decoration: none; font-weight: 600; }
    .training-footnote { font-size: 12px; color: #64748b; font-style: italic; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
    .preheader-hide { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; font-size: 1px; line-height: 1px; overflow: hidden; mso-hide: all; max-height: 0; max-width: 0; }
  </style>
</head>
<body>
  <span class="preheader-hide">${preheaderEsc}</span>
  <div class="container">
    <div class="header">
      <p class="header-kicker">Privacy &amp; data protection</p>
      <h1>GDPR Report — ${escHtml(monthName)}</h1>
      <p>HelloFresh · DACH, France, BNL &amp; Nordics</p>
    </div>

    <div class="executive-summary">
      <h2>vs previous month (absolute change)</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center" width="33%" valign="top" style="padding:8px 6px;">
            <span class="metric-label">Deletions</span>
            ${gdprExecMomHtml(curDel, prevDel, hasPrevForMom)}
          </td>
          <td align="center" width="34%" valign="top" style="padding:8px 6px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <span class="metric-label">Access requests</span>
            ${gdprExecMomHtml(curAccess, prevAccess, hasPrevForMom)}
          </td>
          <td align="center" width="33%" valign="top" style="padding:8px 6px;">
            <span class="metric-label">Issues / incidents</span>
            ${marketDeepDive ? gdprExecMomHtml(curIssues, prevIssues, hasPrevForMom) : '<span style="font-size:11px;color:#9ca3af;">—</span>'}
          </td>
        </tr>
      </table>
    </div>

    ${marketDeepDive && marketDeepDive.summaryAndOutlook ? `
    <div class="section">
      <h2>Summary &amp; Outlook</h2>
      <p style="line-height: 1.65;">${escHtml(marketDeepDive.summaryAndOutlook).replace(/\n/g, '<br>')}</p>
    </div>
    ` : ''}

    ${marketDeepDive && marketDeepDive.significantIncidents && marketDeepDive.significantIncidents.length > 0 ? `
    <div class="section">
      <h2>GDPR incidents &amp; compliance risks</h2>
      ${marketDeepDive.significantIncidents.map((inc, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const desc0 = inc.description.split('Compliance Risk:')[0].replace('What happened:', '').trim();
        const riskPart = inc.description.includes('Compliance Risk:')
          ? inc.description.split('Compliance Risk:')[1].split('Status/Impact:')[0].trim()
          : '';
        const statusPart = inc.description.includes('Status/Impact:')
          ? inc.description.split('Status/Impact:')[1].trim()
          : '';
        return `
        <div class="incident-card">
          <div class="incident-card-hd">
            <span class="incident-badge">${letter}</span>
            <span class="incident-title">${escHtml(inc.title)}</span>
          </div>
          <div class="incident-body">
            <ul class="incident-list" style="list-style: disc;">
              <li><strong>What happened:</strong> ${escHtml(desc0)}</li>
              ${inc.description.includes('Compliance Risk:') ? `<li><strong>Compliance risk:</strong> ${escHtml(riskPart)}</li>` : ''}
              ${inc.description.includes('Status/Impact:') ? `<li><strong>Status / impact:</strong> ${escHtml(statusPart)}</li>` : ''}
            </ul>
          </div>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    ${marketDeepDive ? `
    <div class="section">
      <h2>Market snapshot</h2>
      <div class="snapshot-wrap">
      <table class="data-table" role="presentation">
        <thead>
          <tr>
            <th>Market</th>
            <th style="text-align: center;">Deletions</th>
            <th style="text-align: center;">Access requests</th>
            <th style="text-align: center;">Legal escalations</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${deepDiveMarketRows}
        </tbody>
      </table>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>Highlights</h2>
      ${marketDeepDive && marketDeepDive.highlightsOverride ? 
        `<p style="line-height: 1.65; white-space: pre-wrap; color: #475569;">${escHtml(marketDeepDive.highlightsOverride).replace(/\n/g, '<br>')}</p>` : 
        generateHighlightsHTML(activityLog)
      }
    </div>

    <div class="section">
      <h2>Lowlights &amp; attention areas</h2>
      ${marketDeepDive && marketDeepDive.lowlightsOverride ? 
        `<p style="line-height: 1.65; white-space: pre-wrap; color: #475569;">${escHtml(marketDeepDive.lowlightsOverride).replace(/\n/g, '<br>')}</p>` : 
        generateLowlightsHTML_Improved(reports, activityLog)
      }
    </div>

    ${trainingReport && trainingReport.totalCases > 0 ? `
    <div class="section">
      <h2>Agent Training Snapshot</h2>
      ${generateTrainingHTML(trainingReport)}
      <div class="training-footnote">*Currently showing data for DACH market only. Additional markets will be included in future reports as training data becomes available.</div>
    </div>
    ` : ''}

    <div class="footer">
      <p style="margin:0;">Report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <a class="footer-cta" href="https://gdpr-assistant.hellofresh.com/reporting" target="_blank" rel="noopener noreferrer">View live report online</a>
      <p style="margin: 14px 0 0 0;"><strong style="color:#334155;">HelloFresh GDPR Team</strong></p>
      ${marketDeepDive && marketDeepDive.attributions && marketDeepDive.attributions.length > 0 ? `
      <p style="margin: 12px 0 0 0; line-height: 1.5;">With thanks for contributions:<br>${marketDeepDive.attributions.sort().map(email => `<span style="color:#334155;font-weight:600;">${escHtml(email)}</span>`).join(' · ')}</p>
      ` : ''}
      <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8;">The live link reflects the same data after weekly submissions and overrides — handy for a quick refresh before meetings.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function generateHighlightsHTML(activityLog: ActivityLogEntry[]): string {
  const wins = activityLog.filter(a => resolveActivityKind(a) === 'win');
  const initiatives = activityLog.filter(a => resolveActivityKind(a) === 'initiative');
  const noteworthy = activityLog.filter(a => resolveActivityKind(a) === 'noteworthy');
  const observations = activityLog.filter(a => resolveActivityKind(a) === 'observation');

  const renderList = (entries: ActivityLogEntry[], title: string, titleColor: string) => {
    if (entries.length === 0) return '';
    let block = `<div class="init-box" style="margin-bottom:10px;">`;
    block += `<h3 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: ${titleColor};">${escHtml(title)}</h3>`;
    block += '<ul style="margin: 4px 0;">';
    entries.forEach(e => {
      const dateStr = e.weekOf ? new Date(e.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const body = escHtml(formatActivityEntryPlainText(e).replace(/^\u2705\s*/, ''));
      block += `<li><span class="market-tag">${escHtml(displayMarketLabel(e.market))}</span>${body} <span style="color: #9ca3af; font-size: 11px;">(${dateStr})</span></li>`;
    });
    block += '</ul></div>';
    return block;
  };

  let html = '';
  html += renderList(wins, 'Wins & achievements', '#14532d');
  html += renderList(initiatives, 'Current initiatives', '#1e3a8a');
  html += renderList(noteworthy, 'Noteworthy', '#92400e');
  html += renderList(observations, 'Observations', '#0c4a6e');

  if (!wins.length && !initiatives.length && !noteworthy.length && !observations.length) {
    html += '<p style="color: #9ca3af; font-style: italic; font-size: 12px;">No highlights reported this month.</p>';
  }

  return html;
}

function generateLowlightsHTML(reports: WeeklyReport[], activityLog: ActivityLogEntry[]): string {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const escalations = activityLog.filter(a => isActivityLowlightKind(resolveActivityKind(a)));
  
  let html = '';
  
  if (atRiskMarkets.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Markets Requiring Attention</h3>';
    html += '<ul style="margin: 4px 0;">';
    atRiskMarkets.forEach(m => {
      const emoji = m.status === 'red' ? '🔴' : '🟡';
      html += `<li>${emoji} <span class="market-tag">${m.market}</span>${m.reason}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (escalations.length > 0) {
    html += '<div class="info-box">';
    html += '<h3 style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600;">Noteworthy Complaints & Issues</h3>';
    
    // Group escalations by market
    const escalationsByMarket = escalations.reduce((acc, e) => {
      const m = displayMarketLabel(e.market);
      if (!acc[m]) acc[m] = [];
      acc[m].push(e);
      return acc;
    }, {} as Record<string, ActivityLogEntry[]>);
    
    // Display grouped by market
    Object.entries(escalationsByMarket).forEach(([market, entries]) => {
      html += `<div style="margin: 8px 0;"><strong style="color: #374151; font-size: 12px;">${market}:</strong><ul style="margin: 2px 0; padding-left: 20px;">`;
      entries.forEach(e => {
        const k = resolveActivityKind(e);
        const label = escHtml(ACTIVITY_KIND_LABELS[k]);
        html += `<li><span style="font-size:11px;font-weight:700;color:#991b1b;">${label}</span> ${escHtml(formatActivityEntryPlainText(e))}</li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
  }
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    html += '<p style="color: #9ca3af; font-style: italic; font-size: 12px;">All markets green - no major issues to report.</p>';
  }
  
  return html;
}

// Improved version with better spacing and market-based structure
function generateLowlightsHTML_Improved(reports: WeeklyReport[], activityLog: ActivityLogEntry[]): string {
  const atRiskMarkets = getMarketStatusData(reports).filter(m => m.status === 'yellow' || m.status === 'red');
  const escalations = activityLog.filter(a => isActivityLowlightKind(resolveActivityKind(a)));
  
  let html = '';
  
  if (atRiskMarkets.length > 0) {
    html += '<div class="risk-box">';
    html += '<h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #92400e;">Markets requiring attention</h3>';
    html += '<ul style="margin: 4px 0; line-height: 1.6;">';
    atRiskMarkets.forEach(m => {
      const emoji = m.status === 'red' ? '🔴' : '🟡';
      html += `<li style="margin: 6px 0;">${emoji} <span class="market-tag">${escHtml(m.market)}</span>${escHtml(m.reason)}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  if (escalations.length > 0) {
    html += '<div class="escalation-box" style="margin-top: 12px;">';
    html += '<h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; color: #991b1b;">Noteworthy complaints &amp; issues</h3>';
    
    // Group escalations by market
    const escalationsByMarket = escalations.reduce((acc, e) => {
      const m = displayMarketLabel(e.market);
      if (!acc[m]) acc[m] = [];
      acc[m].push(e);
      return acc;
    }, {} as Record<string, ActivityLogEntry[]>);
    
    // Display grouped by market with better structure
    Object.entries(escalationsByMarket).forEach(([market, entries], idx) => {
      html += `<div style="margin: ${idx > 0 ? '15px' : '0'} 0;">`;
      html += `<h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #111827;">${market}</h4>`;
      html += '<ul style="margin: 0; padding-left: 20px; line-height: 1.6;">';
      entries.forEach(e => {
        const dateStr = e.weekOf ? new Date(e.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const k = resolveActivityKind(e);
        const label = escHtml(ACTIVITY_KIND_LABELS[k]);
        html += `<li style="margin: 5px 0; color: #4b5563;"><span style="font-size:11px;font-weight:700;color:#991b1b;">${label}</span> ${escHtml(formatActivityEntryPlainText(e))} <span style="color: #9ca3af; font-size: 11px;">(${dateStr})</span></li>`;
      });
      html += '</ul></div>';
    });
    html += '</div>';
  }
  
  if (atRiskMarkets.length === 0 && escalations.length === 0) {
    html += '<p style="color: #10b981; font-weight: 600; font-size: 13px;">🎉 All markets green - no major issues to report!</p>';
  }
  
  return html;
}

function generateTrainingHTML(trainingReport: TrainingReport): string {
  let html = '<p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">Common 1st Line Agent errors identified this month requiring training intervention.</p>';
  
  // Group by market
  const marketGroups = new Map<string, typeof trainingReport.topErrors>();
  trainingReport.topErrors.forEach(error => {
    if (!marketGroups.has(error.market)) {
      marketGroups.set(error.market, []);
    }
    marketGroups.get(error.market)!.push(error);
  });

  marketGroups.forEach((errors, market) => {
    html += `<div style="margin-bottom: 15px;">`;
    html += `<h3 style="margin: 0 0 10px 0; font-size: 16px;"><span class="market-tag">${market}</span> Top Errors (${errors.reduce((sum, e) => sum + e.count, 0)} cases)</h3>`;
    html += '<table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top:8px;">';
    html += '<thead><tr style="border-bottom: 2px solid #ddd;">';
    html += '<th style="text-align: left; padding: 8px;">Error Type</th>';
    html += '<th style="text-align: right; padding: 8px;">Count</th>';
    html += '<th style="text-align: center; padding: 8px;">Trend</th>';
    html += '</tr></thead><tbody>';
    
    errors.slice(0, 5).forEach(error => {
      const trendIcon = error.trend === 'up' ? '📈' : error.trend === 'down' ? '📉' : '➡️';
      const trendColor = error.trend === 'up' ? '#DC2626' : error.trend === 'down' ? '#059669' : '#6B7280';
      const englishDescription = translateErrorDescription(error.errorDescription);
      html += '<tr style="border-bottom: 1px solid #eee;">';
      html += `<td style="padding: 8px; color: #333;">${englishDescription}</td>`;
      html += `<td style="padding: 8px; text-align: right; font-weight: bold;">${error.count}</td>`;
      html += `<td style="padding: 8px; text-align: center; color: ${trendColor};">${trendIcon}</td>`;
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    html += '</div>';
  });

  if (marketGroups.size === 0) {
    html += '<p style="color: #888; font-style: italic;">No training cases reported this month.</p>';
  }

  return html;
}

export { generateMonthlySummaryHTML, translateErrorDescription };
