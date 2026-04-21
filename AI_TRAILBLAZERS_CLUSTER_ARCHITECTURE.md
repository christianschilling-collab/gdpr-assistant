# Multi-Team AI Trailblazers Dashboard - UPDATED Architecture Plan

## Vision: Customer Care Cluster-Wide AI Upskilling

### Business Context

**Organizational Hierarchy:**

```
Customer Care Cluster (Kirsten - Cluster Lead)
├── Christian's Team (DACH AI Trailblazers)
│   ├── Christian (Lead)
│   ├── 5 Participants
│   └── Workshops, Resources, Proficiency Tracking
│
├── Jessica's Team
│   ├── Jessica (AI Lead)
│   ├── Team Members
│   └── Own Workshops, Resources, Goals
│
├── Stefan's Team
│   ├── Stefan (AI Lead)
│   ├── Team Members
│   └── Own Workshops, Resources, Goals
│
├── Myrtille's Team
│   ├── Myrtille (AI Lead)
│   ├── Team Members
│   └── Own Workshops, Resources, Goals
│
└── Other Teams...
```

### Requirements

#### 1. Standardization
- All teams use the same **HF Generative AI Frameworks**
- Consistent structure, categories, and evaluation criteria
- Shared AI Project templates

#### 2. Scalability
- Each AI Lead can run their own team dashboard
- No limit on number of teams or participants
- Easy onboarding for new teams

#### 3. Aggregation (Key!)
- **Cluster-wide proficiency levels** (not just 6 people)
- Kirsten sees: Overall cluster progress (e.g., 50 participants across 5 teams)
- Trend analysis: Dec 2025 → Dec 2026 for entire cluster

#### 4. Privacy Levels
**Private (Team-Only):**
- Workshops (team-specific)
- Resources (unless shared)
- Goals & Evaluations
- Individual proficiency levels

**Cluster-Visible (Kirsten + Team Leads):**
- Aggregated proficiency statistics
- Team progress summaries

**Public (Cross-Team):**
- AI Projects (for inspiration and cross-pollination)
- Best practices
- Success stories

#### 5. Role-Based Access
- **Cluster Lead (Kirsten):** Sees everything, cluster-wide view
- **Team Lead (Jessica, Stefan, Myrtille):** Sees only their team + public AI projects
- **Team Member:** Sees their team + public AI projects

---

## Recommended Architecture: Cluster + Teams

### Firestore Structure

```
/clusters/{clusterId}
  - name: "Customer Care Cluster"
  - clusterLead: "kirsten@hellofresh.resch@hellofresh.de"
  - description: "..."
  - createdAt: Timestamp
  
  /teams/{teamId}
    - name: "Jessica's Team"
    - teamLead: "jessica@hellofresh.nl"
    - members: ["email1", "email2", ...]
    - privacy: "cluster" | "private"
    - createdAt: Timestamp
    
    /participants/{participantId}
      - email: "..."
      - name: "..."
      - joinedAt: Timestamp
      
    /workshops/{workshopId}
      - title: "..."
      - date: Timestamp
      - visibility: "team" | "cluster" | "public"
      
    /resources/{resourceId}
      - title: "..."
      - visibility: "team" | "cluster" | "public"
      
    /proficiency/{proficiencyId}
      - participantEmail: "..."
      - category: "..."
      - level: 1-5
      - assessedAt: Timestamp
      - visibility: "team" | "cluster" (never public for individuals)

/aiProjects/{projectId}  // SEPARATE COLLECTION - Always Public!
  - name: "GDPR Assistant"
  - owner: "christian.schilling@hellofresh.de"
  - teamId: "dach-trailblazers"
  - clusterId: "customer-care"
  - benefitsTeam: "..."
  - benefitsCompany: "..."
  - status: "Live"
  - visibility: "public" // Always public across entire organization
```

### Why This Structure?

1. **Cluster Concept:** Kirsten owns the cluster, teams belong to cluster
2. **Team Independence:** Each team has own workshops, resources, etc.
3. **Granular Privacy:** Field-level `visibility` controls
4. **AI Projects Separate:** Always public, not tied to team privacy
5. **Aggregation-Ready:** Queries can aggregate across cluster

---

## Firestore Security Rules

[`firestore-rules-COMBINED-FINAL.txt`](firestore-rules-COMBINED-FINAL.txt)

```javascript
// ============================================
// AI TRAILBLAZERS - CLUSTER + MULTI-TEAM (v2.0)
// ============================================

// Helper: Check if user is HelloFresh employee
function isHelloFreshUser() {
  return request.auth != null && 
         request.auth.token.email.matches('.*@hellofresh\\.com$');
}

// Helper: Check if user is cluster lead
function isClusterLead(clusterId) {
  return request.auth != null && 
         request.auth.token.email == get(/databases/$(database)/documents/clusters/$(clusterId)).data.clusterLead;
}

// Helper: Check if user is team lead
function isTeamLead(clusterId, teamId) {
  return request.auth != null && 
         request.auth.token.email == get(/databases/$(database)/documents/clusters/$(clusterId)/teams/$(teamId)).data.teamLead;
}

// Helper: Check if user is team member
function isTeamMember(clusterId, teamId) {
  let team = get(/databases/$(database)/documents/clusters/$(clusterId)/teams/$(teamId)).data;
  return request.auth != null && 
         (request.auth.token.email in team.members || 
          request.auth.token.email == team.teamLead);
}

// Clusters Collection
match /clusters/{clusterId} {
  // Anyone can read cluster metadata (for discovery)
  allow read: if isHelloFreshUser();
  
  // Create cluster: Any HF user (e.g., Kirsten creates Customer Care Cluster)
  allow create: if isHelloFreshUser() && 
                   request.resource.data.clusterLead == request.auth.token.email;
  
  // Update/Delete: Only cluster lead
  allow update, delete: if isClusterLead(clusterId);
  
  // Teams subcollection
  match /teams/{teamId} {
    // Read: Cluster lead OR team member
    allow read: if isClusterLead(clusterId) || isTeamMember(clusterId, teamId);
    
    // Create: Cluster lead OR any HF user (self-service team creation)
    allow create: if isClusterLead(clusterId) || 
                     (isHelloFreshUser() && request.resource.data.teamLead == request.auth.token.email);
    
    // Update/Delete: Cluster lead OR team lead
    allow update, delete: if isClusterLead(clusterId) || isTeamLead(clusterId, teamId);
    
    // Participants subcollection
    match /participants/{participantId} {
      // Read: Cluster lead OR team member
      allow read: if isClusterLead(clusterId) || isTeamMember(clusterId, teamId);
      
      // Write: Cluster lead OR team lead
      allow write: if isClusterLead(clusterId) || isTeamLead(clusterId, teamId);
    }
    
    // Workshops subcollection (PRIVATE by default)
    match /workshops/{workshopId} {
      // Read: Based on visibility
      allow read: if (resource.data.visibility == 'team' && isTeamMember(clusterId, teamId)) ||
                     (resource.data.visibility == 'cluster' && isClusterLead(clusterId)) ||
                     (resource.data.visibility == 'public' && isHelloFreshUser());
      
      // Write: Cluster lead OR team lead
      allow write: if isClusterLead(clusterId) || isTeamLead(clusterId, teamId);
    }
    
    // Resources subcollection (PRIVATE by default, can be shared)
    match /resources/{resourceId} {
      // Read: Based on visibility
      allow read: if (resource.data.visibility == 'team' && isTeamMember(clusterId, teamId)) ||
                     (resource.data.visibility == 'cluster' && isClusterLead(clusterId)) ||
                     (resource.data.visibility == 'public' && isHelloFreshUser());
      
      // Create: Team members can create
      allow create: if isTeamMember(clusterId, teamId) && 
                       request.resource.data.addedBy == request.auth.token.email;
      
      // Update/Delete: Creator OR team lead OR cluster lead
      allow update, delete: if isClusterLead(clusterId) || 
                               isTeamLead(clusterId, teamId) || 
                               resource.data.addedBy == request.auth.token.email;
    }
    
    // Proficiency subcollection (CLUSTER-VISIBLE for aggregation)
    match /proficiency/{proficiencyId} {
      // Read: Cluster lead (for aggregation) OR team member
      allow read: if isClusterLead(clusterId) || isTeamMember(clusterId, teamId);
      
      // Create/Update: User updates own proficiency OR team lead assesses
      allow create, update: if (isTeamMember(clusterId, teamId) && 
                                request.resource.data.participantEmail == request.auth.token.email) ||
                               isTeamLead(clusterId, teamId) ||
                               isClusterLead(clusterId);
      
      // Delete: Only team lead or cluster lead
      allow delete: if isTeamLead(clusterId, teamId) || isClusterLead(clusterId);
    }
  }
}

// AI Projects Collection (ALWAYS PUBLIC - separate from teams!)
match /aiProjects/{projectId} {
  // Anyone (HF user) can read ALL projects (cross-team inspiration!)
  allow read: if isHelloFreshUser();
  
  // Create: Any HF user can document their AI project
  allow create: if isHelloFreshUser() && 
                   request.resource.data.owner == request.auth.token.email;
  
  // Update: Owner OR cluster lead (if project belongs to their cluster)
  allow update: if resource.data.owner == request.auth.token.email ||
                   (resource.data.clusterId != null && 
                    get(/databases/$(database)/documents/clusters/$(resource.data.clusterId)).data.clusterLead == request.auth.token.email);
  
  // Delete: Owner only
  allow delete: if resource.data.owner == request.auth.token.email;
}
```

**Key Points:**
- **Proficiency:** Cluster lead (Kirsten) can read ALL proficiency data for aggregation
- **Workshops/Resources:** Private by default, visibility field controls access
- **AI Projects:** Always public across organization (not tied to team privacy)

---

## TypeScript Interfaces

[`lib/types/teams.ts`](lib/types/teams.ts)

```typescript
export interface Cluster {
  id: string;
  name: string;
  description: string;
  clusterLead: string; // email
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  clusterId: string;
  name: string;
  description: string;
  teamLead: string; // email
  members: string[]; // emails
  privacy: 'cluster' | 'private'; // default: cluster (Kirsten can see)
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'lead' | 'member';
  joinedAt: Date;
}

export interface Workshop {
  id: string;
  teamId: string;
  title: string;
  description: string;
  date: Date;
  visibility: 'team' | 'cluster' | 'public';
  createdBy: string;
  attendees: string[];
  createdAt: Date;
}

export interface Resource {
  id: string;
  teamId: string;
  title: string;
  url: string;
  description: string;
  category: string;
  visibility: 'team' | 'cluster' | 'public';
  addedBy: string;
  createdAt: Date;
}

export interface Proficiency {
  id: string;
  teamId: string;
  participantEmail: string;
  category: string; // "Prompt Engineering", "AI Tools", etc.
  level: 1 | 2 | 3 | 4 | 5; // 1=Beginner, 5=Expert
  assessedAt: Date;
  assessedBy: string; // email
  notes?: string;
  visibility: 'team' | 'cluster'; // Never public for individuals!
}

export interface AIProject {
  id: string;
  clusterId?: string; // Optional: which cluster it belongs to
  teamId?: string; // Optional: which team created it
  name: string;
  description: string;
  owner: string; // email
  coOwners: string[];
  status: 'Idea' | 'In Progress' | 'Live' | 'On Hold';
  category: 'Process Automation' | 'Analytics' | 'Training' | 'Compliance' | 'Other';
  
  // Benefits
  benefitsTeam: string;
  benefitsCompany: string;
  benefitsCustomers: string;
  
  // Metrics
  metricsBefore: string;
  metricsAfter: string;
  keyImpactNumber: string;
  
  // Showcase
  technologies: string[];
  demoLink?: string;
  screenshots?: string[];
  
  // Timeline
  startedDate: Date;
  completedDate?: Date;
  
  // Additional
  nextSteps?: string;
  learnings?: string;
  
  // Metadata
  visibility: 'public'; // Always public!
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

---

## UI Views

### 1. Cluster Overview (for Kirsten)

**URL:** `/clusters/{clusterId}/overview`

**Shows:**
- **Cluster-wide stats:**
  - Total participants across all teams
  - Average proficiency levels (aggregated)
  - Progress over time (Dec 2025 → Dec 2026)
  - Number of workshops conducted
  - AI Projects launched

- **Team Breakdown:**
  - List of teams with key metrics
  - Which teams are most active
  - Which teams need support

- **AI Projects Showcase:**
  - All projects from this cluster
  - Impact numbers

**Access:** Only Kirsten (Cluster Lead)

---

### 2. Team Dashboard (for Team Leads)

**URL:** `/clusters/{clusterId}/teams/{teamId}/dashboard`

**Shows:**
- **Team stats:** Participants, workshops, proficiency levels
- **Workshops:** Team-specific workshops
- **Resources:** Team resources + public resources
- **Proficiency Tracking:** Team members' levels
- **Goals & Evaluations:** Team-specific

**Access:** Team Lead + Team Members + Kirsten

---

### 3. AI Projects Gallery (Public)

**URL:** `/ai-projects`

**Shows:**
- All AI Projects across organization
- Filter by cluster, team, category, status
- Inspiration for other teams

**Access:** All HelloFresh users

---

### 4. My Dashboard (for Individuals)

**URL:** `/my-dashboard`

**Shows:**
- Teams I'm part of
- My proficiency levels
- Workshops I attended
- Resources I saved
- AI Projects I contributed to

**Access:** Any logged-in user

---

## Aggregation Queries (for Kirsten)

### Cluster-Wide Proficiency Aggregation

```typescript
async function getClusterProficiency(clusterId: string): Promise<ClusterProficiencyReport> {
  // Query all proficiency records across all teams in cluster
  const teams = await getTeamsInCluster(clusterId);
  
  let allProficiency: Proficiency[] = [];
  for (const team of teams) {
    const teamProficiency = await getProficiencyForTeam(clusterId, team.id);
    allProficiency.push(...teamProficiency);
  }
  
  // Aggregate by category
  const categories = groupBy(allProficiency, 'category');
  const averages = Object.keys(categories).map(category => ({
    category,
    averageLevel: mean(categories[category].map(p => p.level)),
    participantCount: categories[category].length,
    distribution: {
      beginner: categories[category].filter(p => p.level <= 2).length,
      intermediate: categories[category].filter(p => p.level === 3).length,
      advanced: categories[category].filter(p => p.level >= 4).length,
    }
  }));
  
  return {
    totalParticipants: allProficiency.length,
    totalTeams: teams.length,
    categoryAverages: averages,
    trend: calculateTrend(allProficiency), // Compare to previous period
  };
}
```

---

## Migration Strategy

### Phase 1: Create Cluster + Migrate Christian's Team

1. **Create "Customer Care Cluster"** (Kirsten as lead)
2. **Migrate existing `dashboard/main`** to `clusters/customer-care/teams/dach-trailblazers`
3. **Test:** Christian's team still works

### Phase 2: Onboard Jessica's Team

1. **Jessica creates her team** via UI
2. **Adds team members**
3. **Starts workshops, adds resources**

### Phase 3: Onboard Other Teams (Stefan, Myrtille, etc.)

1. Self-service onboarding
2. Each team lead creates team, adds members

### Phase 4: Kirsten's Cluster View

1. Implement cluster-wide aggregation
2. Dashboard for Kirsten showing all teams

---

## Implementation Timeline

### Week 1: Foundation (6-8 hours)
- [ ] TypeScript interfaces (Cluster, Team, Proficiency, etc.)
- [ ] Firebase functions (CRUD for clusters, teams)
- [ ] Firestore Rules (cluster + multi-team)
- [ ] Migration script (dashboard/main → clusters/customer-care/teams/dach)

### Week 2: Team UI (6-8 hours)
- [ ] Team creation flow
- [ ] Team dashboard (scoped to team)
- [ ] Team settings (add/remove members)
- [ ] Team switcher component

### Week 3: Cluster View (4-6 hours)
- [ ] Cluster overview dashboard (for Kirsten)
- [ ] Aggregation queries (proficiency across teams)
- [ ] Trend analysis (Dec 2025 → Dec 2026)

### Week 4: AI Projects Integration (3-4 hours)
- [ ] Migrate AI Projects to new structure
- [ ] Public AI Projects gallery
- [ ] Link projects to teams/clusters

**Total Effort:** 19-26 hours (4-5 sessions)

---

## Onboarding Flow & Self-Evaluation

### New User Journey

**1. First Login (HelloFresh Email required)**

```
User signs in with Google (@hellofresh.com)
  ↓
Landing Page: "Welcome to AI Trailblazers!"
  ↓
Self-Evaluation (REQUIRED)
  ↓
Join/Create Team
  ↓
Personalized Resource Recommendations
  ↓
Dashboard Access
```

### Landing Page: `/welcome`

**Content:**
- Welcome message
- Explain AI Trailblazers purpose
- Show cluster structure (Customer Care Cluster)
- Available teams to join OR create new team
- **CTA:** "Start Self-Evaluation"

**Logic:**
```typescript
useEffect(() => {
  if (user && !userProfile.hasCompletedSelfEvaluation) {
    router.push('/onboarding/self-evaluation');
  } else if (user && userProfile.teams.length === 0) {
    router.push('/onboarding/join-team');
  }
}, [user, userProfile]);
```

### Self-Evaluation (MANDATORY)

**URL:** `/onboarding/self-evaluation`

**Categories (match HF Generative AI Framework):**
- Prompt Engineering (Level 1-5)
- AI Tools Usage (Level 1-5)
- Data Privacy & Ethics (Level 1-5)
- Use Case Identification (Level 1-5)
- Coding with AI (Level 1-5)

**Level Descriptions:**
- **Level 1 (Beginner):** "Ich habe noch keine Erfahrung"
- **Level 2 (Aware):** "Ich habe davon gehört, aber nicht praktisch genutzt"
- **Level 3 (Practical):** "Ich nutze es gelegentlich"
- **Level 4 (Proficient):** "Ich nutze es regelmäßig und erfolgreich"
- **Level 5 (Expert):** "Ich kann andere darin schulen"

**After Submission:**
- Store baseline proficiency in Firestore
- Generate personalized resource recommendations
- Redirect to resource recommendations page

### Resource Recommendations (Based on Skill Level)

**URL:** `/onboarding/recommendations`

**Logic:**
```typescript
function getResourceRecommendations(proficiencyLevels: Proficiency[]): Resource[] {
  const recommendations: Resource[] = [];
  
  proficiencyLevels.forEach(prof => {
    if (prof.level <= 2) {
      // Beginner resources for this category
      recommendations.push(...getBeginnerResources(prof.category));
    } else if (prof.level === 3) {
      // Intermediate resources
      recommendations.push(...getIntermediateResources(prof.category));
    } else if (prof.level >= 4) {
      // Advanced resources
      recommendations.push(...getAdvancedResources(prof.category));
    }
  });
  
  return recommendations;
}
```

**Example:**
```
Prompt Engineering (Level 2 - Aware)
→ Recommended Resources:
  📚 "Intro to Prompt Engineering" (Beginner)
  🎥 "ChatGPT Basics" Video Tutorial
  🔗 OpenAI Prompt Engineering Guide
  
AI Tools Usage (Level 4 - Proficient)
→ Recommended Resources:
  📚 "Advanced AI Workflows" (Advanced)
  🎥 "Gemini 2.0 Best Practices"
  🔗 Building Custom GPTs
```

**UI:**
- Show recommendations grouped by category
- "Add to My Resources" button
- "Skip" option (can revisit later)

### Enhanced Resource Structure

Update [`lib/types/teams.ts`](lib/types/teams.ts):

```typescript
export interface Resource {
  id: string;
  teamId?: string; // Optional - can be global
  title: string;
  url: string;
  description: string;
  category: string; // "Prompt Engineering", "AI Tools", etc.
  skillLevel: 'beginner' | 'intermediate' | 'advanced'; // NEW!
  type: 'article' | 'video' | 'tutorial' | 'tool' | 'documentation';
  visibility: 'team' | 'cluster' | 'public';
  addedBy: string;
  createdAt: Date;
  tags?: string[];
}

export interface UserProfile {
  email: string;
  name: string;
  hasCompletedSelfEvaluation: boolean; // NEW!
  selfEvaluationDate?: Date; // NEW!
  teams: string[]; // Team IDs user belongs to
  clusters: string[]; // Cluster IDs user belongs to
  savedResources: string[]; // Resource IDs user bookmarked
  createdAt: Date;
  lastLoginAt: Date;
}
```

---

## Admin Roles & Permissions

### Question: Wer verwaltet was?

**Option 1: Christian = Platform Admin (EMPFOHLEN)**

```
Christian (Platform Admin)
├── Can create/manage ALL clusters
├── Can assign Cluster Leads
├── Can override any settings
├── Technical owner
└── Fallback for all permissions

Kirsten (Cluster Lead - Customer Care)
├── Can manage Customer Care Cluster
├── Can create/manage teams in her cluster
├── Can assign Team Leads
├── Can see all data in her cluster
└── Cannot touch other clusters

Jessica, Stefan, Myrtille (Team Leads)
├── Can manage their own team
├── Can add/remove team members
├── Can create workshops/resources
└── Cannot manage other teams
```

**Firestore Structure:**

```
/platformAdmins
  - christian.schilling@hellofresh.de: true

/clusters/customer-care
  - clusterLead: "kirsten.resch@hellofresh.de"
  - admins: ["kirsten.resch@hellofresh.de"]
  
  /teams/jessica-team
    - teamLead: "jessica@hellofresh.nl"
```

**Firestore Rules Update:**

```javascript
// Helper: Check if user is platform admin
function isPlatformAdmin() {
  return request.auth != null && 
         exists(/databases/$(database)/documents/platformAdmins/$(request.auth.token.email));
}

// Clusters Collection
match /clusters/{clusterId} {
  // Read: Anyone can read cluster metadata
  allow read: if isHelloFreshUser();
  
  // Create: Platform admins OR self-service (user becomes cluster lead)
  allow create: if isPlatformAdmin() || 
                   (isHelloFreshUser() && request.resource.data.clusterLead == request.auth.token.email);
  
  // Update/Delete: Platform admin OR cluster lead
  allow update, delete: if isPlatformAdmin() || isClusterLead(clusterId);
  
  // Teams subcollection
  match /teams/{teamId} {
    // Create: Platform admin OR cluster lead OR self-service (becomes team lead)
    allow create: if isPlatformAdmin() || 
                     isClusterLead(clusterId) || 
                     (isHelloFreshUser() && request.resource.data.teamLead == request.auth.token.email);
    
    // Update/Delete: Platform admin OR cluster lead OR team lead
    allow update, delete: if isPlatformAdmin() || 
                             isClusterLead(clusterId) || 
                             isTeamLead(clusterId, teamId);
    // ... rest
  }
}
```

**Deine Rolle (Christian):**
- ✅ Platform Admin (can do anything)
- ✅ Technical Owner (deployments, rules, architecture)
- ✅ Can assign Cluster Leads (z.B. Kirsten für Customer Care)
- ✅ Fallback: Wenn jemand Probleme hat, kannst du eingreifen
- ❌ Nicht für Daily Operations (das machen Kirsten/Jessica/etc.)

**Kirsten's Rolle:**
- ✅ Cluster Lead (Customer Care)
- ✅ Can create teams, assign team leads
- ✅ Can see all data in her cluster (für Aggregation)
- ❌ Kann keine anderen Clusters sehen

**Jessica/Stefan/Myrtille's Rolle:**
- ✅ Team Lead (eigenes Team)
- ✅ Can manage team members
- ❌ Kann keine anderen Teams verwalten

---

**Option 2: Kirsten = Super Admin (Alternative)**

Wenn Kirsten die volle Verantwortung haben soll:
- Kirsten = Platform Admin (zusätzlich zu Christian)
- Sie kann Clusters erstellen, nicht nur Customer Care verwalten

**Meine Empfehlung:** Option 1 (Christian = Platform Admin, Kirsten = Cluster Lead)

**Warum?**
- Klare Trennung: Technisch (Christian) vs. Business (Kirsten)
- Kirsten fokussiert auf Customer Care Cluster
- Falls andere Cluster kommen (z.B. Tech Cluster), eigener Cluster Lead
- Du bleibst technischer Ansprechpartner

---

## Additional Considerations

### 1. Self-Service Team Creation

**Sollte jeder ein Team erstellen können?**

**Empfehlung:** Ja, aber mit Approval-Prozess

```typescript
interface Team {
  // ...
  status: 'pending' | 'active' | 'archived';
  approvedBy?: string; // Cluster lead email
  approvedAt?: Date;
}
```

**Flow:**
1. Jessica erstellt Team → Status: "pending"
2. Kirsten bekommt Notification
3. Kirsten approved → Status: "active"
4. Team wird sichtbar

**Alternative (einfacher):**
- Jeder kann Team erstellen (Status: "active" sofort)
- Cluster Lead kann später archivieren falls nötig

### 2. Team Join Flow

**Wie treten Members Teams bei?**

**Option A: Invite-Only**
- Team Lead lädt per Email ein
- User bekommt Invite-Link
- Klickt Link → wird zu Team hinzugefügt

**Option B: Open Join**
- Teams sind "discoverable"
- User kann Beitrittsanfrage senden
- Team Lead approved

**Option C: Auto-Join (basierend auf Org Chart)**
- User gibt Manager an → automatisch dem Team zugeordnet
- Oder: Import aus HR System

**Empfehlung:** Option A (Invite-Only) für Start, später Option B hinzufügen

### 3. Re-Evaluation Cadence

**Wie oft Self-Evaluation wiederholen?**

**Empfehlung:** 
- Baseline: Bei Onboarding (Pflicht)
- Follow-up: Quarterly (Optional, aber empfohlen)
- Trigger: Nach Workshop oder Training

**UI:**
```typescript
if (daysSince(userProfile.selfEvaluationDate) > 90) {
  showBanner("Zeit für eine neue Self-Evaluation! 📊");
}
```

### 4. Resource Curation

**Wer pflegt die Global Resources?**

**Empfehlung:**
- Platform Admin (Christian) erstellt "Global Resource Library"
- Cluster Lead (Kirsten) kann Cluster-spezifische Resources hinzufügen
- Team Leads können Team-Resources hinzufügen
- Jeder kann Resources für sich bookmarken

**Visibility:**
```
Global Resources (Christian)
  → Visibility: "public" → Alle sehen
  
Cluster Resources (Kirsten)
  → Visibility: "cluster" → Nur Customer Care sieht
  
Team Resources (Jessica)
  → Visibility: "team" → Nur Jessica's Team sieht
```

### 5. Skill Level Progression Tracking

**Wie tracken wir Progress?**

```typescript
interface ProficiencyHistory {
  participantEmail: string;
  category: string;
  timeline: {
    date: Date;
    level: number;
    assessedBy: string; // "self" | email
  }[];
}
```

**UI:** Chart zeigt Progress:
```
Prompt Engineering
Level 2 (Jan 2026) → Level 3 (Apr 2026) → Level 4 (Jul 2026)
```

---

## Updated Implementation Timeline

### Week 1: Foundation + Onboarding (8-10 hours)
- [ ] TypeScript interfaces (Cluster, Team, UserProfile, Resource with skillLevel)
- [ ] Firebase functions (CRUD for clusters, teams, user profiles)
- [ ] Firestore Rules (platform admin, cluster lead, team lead)
- [ ] Migration script (dashboard/main → clusters/customer-care/teams/dach)
- [ ] Landing page (`/welcome`)
- [ ] Self-Evaluation form (`/onboarding/self-evaluation`)

### Week 2: Team UI + Resource Recommendations (8-10 hours)
- [ ] Team creation flow (with pending/active status)
- [ ] Team dashboard (scoped to team)
- [ ] Resource recommendation engine
- [ ] Resource library with skill-level filtering
- [ ] Team settings (add/remove members, invite flow)
- [ ] Team switcher component

### Week 3: Cluster View + Aggregation (6-8 hours)
- [ ] Cluster overview dashboard (for Kirsten)
- [ ] Aggregation queries (proficiency across teams)
- [ ] Trend analysis (Dec 2025 → Dec 2026)
- [ ] Proficiency history tracking

### Week 4: AI Projects + Polish (4-6 hours)
- [ ] Migrate AI Projects to new structure
- [ ] Public AI Projects gallery
- [ ] Link projects to teams/clusters
- [ ] Admin panel (for Christian - manage platform admins, cluster leads)
- [ ] Notifications (team invites, approvals)

**Total Effort:** 26-34 hours (5-7 sessions)

---

## Success Criteria (Updated)

After implementation:

1. **Any HelloFresh user can:**
   - Sign in with @hellofresh email
   - Complete self-evaluation (mandatory)
   - Get personalized resource recommendations
   - Join or create a team

2. **Kirsten (Cluster Lead) can:**
   - See cluster-wide proficiency levels
   - Track progress across all teams
   - Approve new teams
   - View all AI projects from her cluster

3. **Jessica (Team Lead) can:**
   - Create and manage her own team
   - Invite team members
   - Add workshops/resources
   - Track team proficiency
   - See public AI projects for inspiration

4. **Team Members can:**
   - Complete self-evaluation
   - Track their own proficiency progression
   - Access personalized resource recommendations
   - Access team resources
   - Contribute to AI projects

5. **Christian (Platform Admin) can:**
   - Manage all clusters and teams
   - Assign cluster leads
   - Create global resources
   - Override any settings (technical owner)

6. **Privacy is enforced:**
   - Teams can't see each other's workshops/resources
   - Kirsten sees everything in her cluster
   - AI Projects are always public

---

## What We Still Need to Clarify

**Questions for you:**

1. **Cluster Creation:** Soll Kirsten den Customer Care Cluster erstellen, oder du?
2. **Team Approval:** Soll es einen Approval-Prozess geben, oder kann jeder sofort ein Team erstellen?
3. **Resource Curation:** Wer erstellt die initialen Global Resources (für Self-Evaluation Recommendations)?
4. **Branding:** Soll die Landing Page HelloFresh-spezifisches Branding haben?

---

Ready to start implementation? Oder sollen wir noch etwas am Plan anpassen?

---

## Next Steps

Ready to proceed with implementation?

**Suggested Start:**
- Week 1 (Foundation) - Critical for everything else
- Then iteratively add Team UI, Cluster View, AI Projects

Would you like me to begin with Phase 1 (Foundation)?
