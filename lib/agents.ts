/**
 * Agent Management
 * List of available agents for case assignment
 */

export interface Agent {
  email: string;
  name: string;
  role?: string;
  active?: boolean;
}

// Mock agents list (in production, this would come from Firebase)
export function getMockAgents(): Agent[] {
  return [
    { email: 'agent1@example.com', name: 'Agent 1', role: '1st Line Agent', active: true },
    { email: 'agent2@example.com', name: 'Agent 2', role: '1st Line Agent', active: true },
    { email: 'agent3@example.com', name: 'Agent 3', role: '1st Line Agent', active: true },
    { email: 'supervisor@example.com', name: 'Supervisor', role: 'Supervisor', active: true },
    { email: 'admin@example.com', name: 'Admin', role: 'Admin', active: true },
  ];
}

// Get all agents (with Firebase fallback)
export async function getAgents(): Promise<Agent[]> {
  // TODO: In production, fetch from Firebase
  // For now, return mock data
  if (typeof window !== 'undefined') {
    return getMockAgents();
  }
  return [];
}

// Get agent by email
export function getAgentByEmail(email: string): Agent | undefined {
  if (typeof window !== 'undefined') {
    return getMockAgents().find(agent => agent.email === email);
  }
  return undefined;
}
