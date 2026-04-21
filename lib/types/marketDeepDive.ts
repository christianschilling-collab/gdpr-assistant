export interface MarketData {
  deletionRequests: number;
  deletionsHC?: number; // Deletions HC (optional, can be added manually)
  dsarRequests: number; // Changed from portabilityRequests
  escalations: number;
  statusText: string; // e.g., "busier than usual", "increased ad revocation due to marketing campaign"
}

export interface SignificantIncident {
  title: string; // e.g., "Salesforce Unsubscribe Issue"
  description: string; // 2-3 sentences explaining the incident
}

export interface MarketDeepDive {
  id?: string;
  month: string; // e.g., "2026-03"
  markets: {
    DACH: MarketData;
    Nordics: MarketData;
    BNL: MarketData;
    Fr: MarketData;
  };
  significantIncidents: SignificantIncident[];
  summaryAndOutlook?: string; // Summary & Outlook section for the report
  attributions?: string[]; // Email addresses of team members who contributed
  highlightsOverride?: string; // Optional manual override for Highlights section
  lowlightsOverride?: string; // Optional manual override for Lowlights section
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // User email
}
