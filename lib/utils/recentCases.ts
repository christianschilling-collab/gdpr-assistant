// Utility to track recently viewed cases
export function addToRecentCases(caseId: string, caseTitle: string, caseName: string) {
  try {
    const recent = localStorage.getItem('recentCases');
    let recentCases = recent ? JSON.parse(recent) : [];
    
    // Remove if already exists (to move to top)
    recentCases = recentCases.filter((c: any) => c.id !== caseId);
    
    // Add to beginning
    recentCases.unshift({
      id: caseId,
      caseId: caseName,
      title: caseTitle,
      timestamp: Date.now(),
    });
    
    // Keep only last 10
    recentCases = recentCases.slice(0, 10);
    
    localStorage.setItem('recentCases', JSON.stringify(recentCases));
  } catch (error) {
    console.error('Error saving recent case:', error);
  }
}

export function getRecentCases() {
  try {
    const recent = localStorage.getItem('recentCases');
    return recent ? JSON.parse(recent) : [];
  } catch (error) {
    console.error('Error loading recent cases:', error);
    return [];
  }
}

export function clearRecentCases() {
  localStorage.removeItem('recentCases');
}

export function formatRecentCaseTime(timestamp: number): string {
  const now = new Date();
  const caseDate = new Date(timestamp);
  
  // Check if today
  const isToday = 
    now.getDate() === caseDate.getDate() &&
    now.getMonth() === caseDate.getMonth() &&
    now.getFullYear() === caseDate.getFullYear();
  
  // Format time (e.g., "07:01am")
  const hours = caseDate.getHours();
  const minutes = caseDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  const timeString = `${displayHours}:${minutes}${ampm}`;
  
  if (isToday) {
    return `Today ${timeString}`;
  }
  
  // Format as "Tue, 08:05pm"
  const weekday = caseDate.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday}, ${timeString}`;
}
