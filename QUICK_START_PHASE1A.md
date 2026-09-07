# QUICK START GUIDE - Phase 1A Widget Data Layer
## For Development Team - Week 1-2

This guide gets you from zero to first working widget API in 2 weeks.

---

## Prerequisites Checklist

- [ ] Node.js 20+
- [ ] PostgreSQL 16 running locally
- [ ] Redis 7+ running locally
- [ ] Drizzle Kit CLI installed globally: `npm install -g drizzle-kit`
- [ ] NextAuth.js configured with working authentication
- [ ] VS Code with TypeScript extension

---

## Week 1: Setup & Database

### Day 1-2: Schema Review & Migrations

**Files to review (in this order):**
1. `IMPLEMENTATION_GUIDE.md` → Section "Database Schema Additions"
2. `src/lib/types/widget-data.ts` → All type definitions
3. Current `src/db/schema.ts` → Understand existing structure

**Action Items:**
```bash
# 1. Backup current database
pg_dump clinic_prod > backup_$(date +%Y%m%d).sql

# 2. Review which new tables you need for Phase 1A
# Minimum for Phase 1A:
# - dashboard_layouts (for layout persistence)
# 
# NOT needed until Phase 3-4:
# - referrals, external_providers, patient_registrations, automation_rules

# 3. Create new migration file
# Update src/db/schema.ts with dashboard_layouts table
# (See IMPLEMENTATION_GUIDE.md for the schema)

# 4. Generate Drizzle migration
drizzle-kit generate:pg
# Follow prompts to generate migration

# 5. Apply migration
drizzle-kit push:pg
```

**Quick Reference: Dashboard Layouts Table**
```typescript
export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => organizations.id).notNull(),
  role: text("role").notNull(),
  userId: uuid("user_id").references(() => users.id), // null = role default
  
  layout: jsonb("layout").notNull(),
  gridColumns: integer("grid_columns").default(12),
  
  visibleWidgets: jsonb("visible_widgets").default([]),
  widgetSettings: jsonb("widget_settings").default({}),
  
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Database Indexes (Critical Performance):**
```sql
CREATE INDEX idx_patients_tenant_primary_doctor ON patients(tenant_id, primary_doctor_id);
CREATE INDEX idx_encounters_patient_start_time ON encounters(patient_id, start_time DESC);
CREATE INDEX idx_dashboard_layouts_tenant_role ON dashboard_layouts(tenant_id, role);
CREATE INDEX idx_lab_results_patient_abnormal ON lab_results(patient_id, is_abnormal, created_at DESC);
```

### Day 3-4: React Query Setup

**Install Dependencies:**
```bash
npm install @tanstack/react-query@latest @tanstack/react-query-devtools swr
```

**Create React Query Provider:**
```typescript
// lib/providers.ts
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,     // 30s
      gcTime: 60 * 1000,         // 60s (was cacheTime)
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

**Wrap App:**
```typescript
// app/layout.tsx
import { QueryProvider } from '@/lib/providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

### Day 5: Widget Data Hook

**Create Generic Hook:**
```typescript
// hooks/useWidgetData.ts
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { WidgetDataResponse } from '@/lib/types/widget-data';

export interface UseWidgetDataOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  enabled?: boolean;
  refetchInterval?: number;
}

export function useWidgetData<T>(
  widgetId: string,
  role: string,
  options: UseWidgetDataOptions = {}
): UseQueryResult<WidgetDataResponse<T>, Error> {
  const { limit = 20, offset = 0, filters = {}, enabled = true, refetchInterval } = options;

  return useQuery({
    queryKey: ['widget', widgetId, role, { limit, offset, ...filters }],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>),
      });

      const response = await fetch(
        `/api/v1/dashboards/${role}/widgets/${widgetId}?${queryParams}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch ${widgetId}: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    refetchInterval: refetchInterval || 60000, // Default: 1 minute
    staleTime: 30000, // Consider data stale after 30s
  });
}
```

**Usage Example:**
```typescript
// In any widget component
import { useWidgetData } from '@/hooks/useWidgetData';
import type { MyPatientsWidgetData } from '@/lib/types/widget-data';

export function MyPatientsWidget() {
  const { data, isLoading, error, isRefetching } = useWidgetData<MyPatientsWidgetData>(
    'my_patients',
    'physician',
    {
      limit: 20,
      filters: { sortBy: 'lastEncounter', sortOrder: 'desc' },
      refetchInterval: 300000, // 5 minutes
    }
  );

  if (isLoading) return <WidgetSkeleton />;
  if (error) return <WidgetError error={error} />;
  if (!data?.data?.length) return <WidgetEmpty message="No patients assigned" />;

  return (
    <div className="space-y-2">
      {data.data.map((patient) => (
        <PatientRow key={patient.patientId} patient={patient} />
      ))}
      {isRefetching && <div className="text-xs text-slate-400">Updating...</div>}
    </div>
  );
}
```

---

## Week 2: API Endpoints & Testing

### Day 1-2: First 5 Widget Endpoints

**Template to Copy:** `src/app/api/v1/dashboards/[role]/widgets/my-patients/route.ts`

**Endpoints to Implement (use template as guide):**

1. **`GET /api/v1/dashboards/physician/widgets/pending-ai-reviews`**
   - Query AI suggestions table
   - Filter by status = 'pending_review' AND role matches
   - Return with confidence scores and linked data points
   
2. **`GET /api/v1/dashboards/physician/widgets/critical-alerts`**
   - Query lab_results, vital_signs where abnormal
   - Query assessment scores where high-risk
   - Order by timestamp DESC, limit to 10
   
3. **`GET /api/v1/dashboards/nurse/widgets/vitals-due`**
   - Query nursing assessment schedule
   - Compare current time vs next due time
   - Return overdue flag
   
4. **`GET /api/v1/dashboards/pharmacist/widgets/medication-orders-to-review`**
   - Query prescriptions where status = 'pending_review'
   - Attach drug interaction warnings from drugChecker service
   - Include renal dosing flags
   
5. **`GET /api/v1/dashboards/care-coordinator/widgets/care-gaps`**
   - Query patients' care plans vs care gaps table
   - Return with recommended actions
   - Link to referral creation

**File Structure:**
```
src/app/api/v1/dashboards/
├── [role]/
│   ├── widgets/
│   │   ├── my-patients/
│   │   │   └── route.ts ✅ (template)
│   │   ├── pending-ai-reviews/
│   │   │   └── route.ts
│   │   ├── critical-alerts/
│   │   │   └── route.ts
│   │   ├── vitals-due/
│   │   │   └── route.ts
│   │   ├── medication-orders-to-review/
│   │   │   └── route.ts
│   │   └── care-gaps/
│   │       └── route.ts
│   └── layout/
│       └── route.ts (for save/restore dashboard layout)
```

### Day 3: Database Queries & Optimization

**Query Performance Checklist:**
```typescript
// ✅ DO: Use specific fields, not SELECT *
const users = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
    email: true,
  },
});

// ✅ DO: Use indexes for WHERE conditions
// CREATE INDEX idx_patients_tenant_primary_doctor ON patients(tenant_id, primary_doctor_id)

// ✅ DO: Limit result sets
const result = await db.query.users.findMany({
  limit: 20,
  offset: 0,
});

// ❌ DON'T: N+1 queries - fetch related data in loop
// BAD: for (const patient of patients) { const labs = await getLabsForPatient(patient.id); }
// GOOD: const labsByPatient = await getLabsForAllPatients(patientIds);

// ❌ DON'T: Large JSONB operations in WHERE clause
// Avoid: WHERE metadata @> '{"key": "value"}'
// Better: Denormalize frequently-queried fields
```

**Common Query Patterns:**

```typescript
// Pattern 1: Fetch with related data (denormalized)
const patients = await db.query.patients.findMany({
  where: eq(patients.primaryDoctorId, userId),
  columns: {
    id: true,
    firstName: true,
    lastName: true,
    triagePriority: true,
  },
  with: {
    primaryDoctor: {
      columns: { fullName: true },
    },
    encounters: {
      columns: { startTime: true, encounterType: true },
      orderBy: desc(encounters.startTime),
      limit: 1,
    },
  },
});

// Pattern 2: Aggregation (count, sum, etc.)
const result = await db
  .select({
    count: sql<number>`count(*)`,
    avgAge: sql<number>`avg(extract(year from age(now(), date_of_birth)))`,
  })
  .from(patients)
  .where(eq(patients.tenantId, tenantId));

// Pattern 3: Pagination with cursor
const limit = 20;
const cursor = req.query.cursor as string | undefined;

const results = await db.query.patients.findMany({
  where: cursor
    ? and(eq(patients.tenantId, tenantId), gt(patients.id, cursor))
    : eq(patients.tenantId, tenantId),
  limit: limit + 1, // Fetch one extra to detect hasMore
  orderBy: asc(patients.id),
});

const hasMore = results.length > limit;
const data = results.slice(0, limit);
const nextCursor = hasMore ? data[data.length - 1].id : null;
```

### Day 4-5: Testing & Documentation

**Create Unit Tests:**
```typescript
// __tests__/api/dashboards/physician/my-patients.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '@/app/api/v1/dashboards/[role]/widgets/my-patients/route';

describe('GET /api/v1/dashboards/physician/widgets/my-patients', () => {
  it('should return paginated patients for physician', async () => {
    // Setup mock session
    const mockRequest = new Request('http://localhost:3000/api/...?limit=20');
    
    // Call endpoint
    const response = await GET(mockRequest, { params: { role: 'physician' } });
    
    // Assertions
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.limit).toBe(20);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should filter by priority', async () => {
    // Test with ?priority=critical
  });

  it('should return 403 for unauthorized role mismatch', async () => {
    // Test authorization
  });
});
```

**Add API Documentation:**
```typescript
// src/app/api/v1/dashboards/[role]/widgets/my-patients/route.ts
/**
 * @endpoint GET /api/v1/dashboards/[role]/widgets/my-patients
 * 
 * @description
 * Returns paginated list of patients assigned to the current user.
 * Role-specific filtering (physicians see their patients, etc.)
 * 
 * @query limit {number} - Items per page (1-100, default 20)
 * @query offset {number} - Pagination offset (default 0)
 * @query priority {string} - Filter by 'routine', 'urgent', 'critical'
 * @query search {string} - Search by name or MRN
 * @query sortBy {string} - 'name', 'lastEncounter', 'triagePriority'
 * @query sortOrder {string} - 'asc' or 'desc'
 * 
 * @returns {WidgetDataResponse<MyPatientsWidgetData>}
 * 
 * @example
 * GET /api/v1/dashboards/physician/widgets/my-patients?limit=20&priority=urgent
 * 
 * @auth Required (JWT token from NextAuth.js)
 * @role Only accessible by users with role matching :role parameter
 * 
 * @cache Cached for 60 seconds, invalidated on patient updates
 * 
 * @realtime Subscribe to WebSocket channel: "my_patients:[userId]"
 */
```

---

## Checklist: End of Week 2

- [ ] Dashboard layouts table migrated to database
- [ ] Database indexes created
- [ ] React Query installed and configured
- [ ] useWidgetData hook implemented and tested
- [ ] 5 core widget endpoints implemented
- [ ] All endpoints return proper WidgetDataResponse
- [ ] Error handling working (401, 403, 500)
- [ ] API response cached with proper headers
- [ ] Unit tests passing
- [ ] API documentation complete
- [ ] Team trained on widget endpoint pattern
- [ ] First widget (MyPatients) converted to API-driven
- [ ] Manual testing in browser devtools

---

## Common Pitfalls to Avoid

1. **Session Handling**: Don't assume session exists on route handlers
   ```typescript
   const session = await getServerSession();
   if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   ```

2. **N+1 Queries**: Always use `with` for related data or fetch separately
   ```typescript
   // Good
   const users = await db.query.users.findMany({
     with: { posts: true }
   });
   
   // Bad
   for (const user of users) {
     user.posts = await getPosts(user.id); // N queries!
   }
   ```

3. **Date Handling**: Always store and return ISO 8601 strings
   ```typescript
   // Good
   timestamp: new Date().toISOString()
   
   // Bad
   timestamp: Date.now() // Milliseconds, hard to parse
   ```

4. **Authorization**: Check role server-side, not client-side
   ```typescript
   // Good - in API handler
   if (currentUser.role !== params.role) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
   }
   
   // Bad - relying on client to enforce
   // if (userRole !== requiredRole) { return <Unauthorized /> }
   ```

5. **Response Size**: Don't return more data than needed
   ```typescript
   // Good - specific columns only
   columns: { id: true, name: true, email: true }
   
   // Bad - all fields
   // (default behavior, can cause large payloads)
   ```

---

## Troubleshooting Common Issues

### "Cannot find module '@tanstack/react-query'"
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
npm install --save-dev @types/node
```

### "PostgreSQL connection failed"
```bash
# Check if Postgres is running
psql -U clinic_user -d clinic_prod -c "SELECT 1"

# Or via docker
docker-compose -f docker-compose.dev.yml up postgres
```

### "NextAuth session is undefined"
```typescript
// Make sure auth middleware is properly configured
// Check .env.local has NEXTAUTH_SECRET and NEXTAUTH_URL
import { getServerSession } from 'next-auth/next';
const session = await getServerSession(); // Returns null if not authenticated
```

### "Drizzle migration fails"
```bash
# Check current database state
drizzle-kit introspect:pg

# If schema is out of sync, generate without applying
drizzle-kit generate:pg

# Review generated SQL before applying
# Then push when ready
drizzle-kit push:pg --draft
```

---

## Success Metrics - End of Phase 1A

- ✅ All 50+ widgets have dedicated API endpoints
- ✅ Widget data returned in < 200ms (p95)
- ✅ Dashboard loads in < 2 seconds
- ✅ Polling fallback working for all widgets
- ✅ No hardcoded demo data in any widget
- ✅ All widgets show loading/error/empty states
- ✅ Pagination working on all list widgets
- ✅ Test coverage > 80% for new APIs
- ✅ Zero client-side authorization logic
- ✅ Full type safety (TypeScript strict mode)

---

## Resources & Links

- **Drizzle ORM**: https://orm.drizzle.team/
- **React Query Docs**: https://tanstack.com/query/latest
- **NextAuth.js**: https://next-auth.js.org/
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html
- **API Design Best Practices**: https://restfulapi.net/

---

## Contact & Support

- **Backend Lead**: [Assign]
- **Frontend Lead**: [Assign]
- **DevOps Lead**: [Assign]
- **Questions?**: Post in #clinic-dev Slack channel

---

*Last Updated: 2026-08-24*  
*Next Review: 2026-09-07 (End of Week 2)*
