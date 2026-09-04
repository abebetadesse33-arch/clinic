/**
 * GET /api/v1/dashboards/[role]/widgets/my-patients
 * 
 * Returns the list of patients assigned to the current user (role-specific).
 * Supports pagination, filtering, and sorting.
 * 
 * For physicians: Patients with this physician as primary_doctor_id
 * For nurses: Patients in assigned ward/unit
 * For care coordinators: All patients in their care coordination scope
 * 
 * Real-time updates via WebSocket channel: "my_patients:[userId]"
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { and, eq, desc, asc, like, inArray, sql } from 'drizzle-orm';
import { patients, users, encounters } from '@/db/schema';
import type { WidgetDataRequest, WidgetDataResponse, MyPatientsWidgetData } from '@/lib/types/widget-data';

// TODO: Integrate NextAuth when installed
// import { getServerSession } from 'next-auth/next';

/**
 * Query parameters:
 *   - limit: number (default 20, max 100)
 *   - offset: number (default 0)
 *   - search: string (search by name or MRN)
 *   - priority: 'routine' | 'urgent' | 'critical'
 *   - sortBy: 'name' | 'lastEncounter' | 'triagePriority' (default: 'lastEncounter')
 *   - sortOrder: 'asc' | 'desc' (default: 'desc')
 */

async function GET(
  request: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    // ==========================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ==========================================
    // TODO: Integrate NextAuth session verification
    // const session = await getServerSession();
    // if (!session || !session.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    const userEmail = request.headers.get('x-user-email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized: missing x-user-email header' },
        { status: 401 }
      );
    }

    // Fetch user to get role and organization
    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify role matches requested dashboard
    if (currentUser.role !== params.role) {
      return NextResponse.json(
        { error: 'Forbidden: Role mismatch' },
        { status: 403 }
      );
    }

    // ==========================================
    // 2. PARSE QUERY PARAMETERS
    // ==========================================
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';
    const priority = url.searchParams.get('priority') || '';
    const sortBy = url.searchParams.get('sortBy') || 'lastEncounter';
    const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // ==========================================
    // 3. BUILD QUERY BASED ON ROLE
    // ==========================================
    let whereConditions = [
      eq(patients.tenantId, currentUser.organizationId),
    ];

    // Role-specific filtering
    switch (params.role) {
      case 'physician':
      case 'nurse_practitioner':
        // Fetch patients where this user is the primary doctor
        whereConditions.push(eq(patients.primaryDoctorId, currentUser.id));
        break;

      case 'nurse':
        // Fetch patients in the same facility/ward
        // TODO: Implement ward assignment logic
        // whereConditions.push(eq(patients.wardId, currentUser.wardId));
        break;

      case 'care_coordinator':
        // Care coordinators see all patients in their organization
        // (can be further restricted by care_plan assignments)
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
    }

    // Add search filter (name or MRN)
    if (search) {
      whereConditions.push(
        like(patients.firstName, `%${search}%`)
      );
    }

    // Add priority filter (cast to enum type)
    if (priority && ['routine', 'urgent', 'critical'].includes(priority)) {
      whereConditions.push(eq(patients.triagePriority, priority as 'routine' | 'urgent' | 'critical'));
    }

    // ==========================================
    // 4. DETERMINE SORT COLUMN
    // ==========================================
    let orderBy;
    switch (sortBy) {
      case 'name':
        orderBy = sortOrder === 'asc'
          ? asc(patients.firstName)
          : desc(patients.firstName);
        break;
      case 'triagePriority':
        // Prioritize critical > urgent > routine
        orderBy = desc(patients.triagePriority);
        break;
      case 'lastEncounter':
      default:
        orderBy = sortOrder === 'asc'
          ? asc(patients.updatedAt)
          : desc(patients.updatedAt);
        break;
    }

    // ==========================================
    // 5. FETCH DATA
    // ==========================================

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(...whereConditions));

    const total = countResult[0]?.count || 0;

    // Fetch paginated results
    const patientRows = await db.query.patients.findMany({
      where: and(...whereConditions),
      orderBy: [orderBy],
      limit,
      offset,
      columns: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        triagePriority: true,
        updatedAt: true,
      },
    });

    // ==========================================
    // 6. ENRICH WITH RELATED DATA
    // ==========================================

    const enrichedPatients: MyPatientsWidgetData[] = await Promise.all(
      patientRows.map(async (p) => {
        // Calculate age
        const birthDate = new Date(p.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        // Get last encounter
        const lastEncounter = await db.query.encounters.findFirst({
          where: eq(encounters.patientId, p.id),
          orderBy: desc(encounters.startTime),
          columns: {
            startTime: true,
            encounterType: true,
          },
        });

        // Get primary diagnosis
        // TODO: Query primary diagnosis from carePlans or clinical data when schema provides diagnosis table
        // const primaryDiagnosis = await db.query.diagnoses.findFirst({...});
        const primaryDiagnosis = { diagnosisName: 'Pending assessment' };

        // TODO: Fetch active alerts from lab results, vital signs, assessment scores
        // This is a placeholder - actual implementation would query multiple tables
        const activeAlerts = 0;
        const criticalAlerts: string[] = [];

        return {
          id: p.id,
          patientId: p.id,
          mrn: p.mrn,
          firstName: p.firstName,
          lastName: p.lastName,
          age,
          gender: p.gender,
          triagePriority: p.triagePriority as 'routine' | 'urgent' | 'critical',
          primaryDiagnosis: primaryDiagnosis?.diagnosisName || 'Not specified',
          lastEncounterDate: lastEncounter?.startTime?.toISOString() || '',
          lastEncounterType: lastEncounter?.encounterType || '',
          activeConditions: 0, // TODO: Count from diagnoses table
          activeAlerts,
          criticalAlerts,
          alertSeverity: criticalAlerts.length > 0 ? 'critical' : 'low',
          nextAppointment: undefined, // TODO: Fetch from encounters table (future dates)
          createdAt: p.updatedAt?.toISOString() || new Date().toISOString(),
        };
      })
    );

    // ==========================================
    // 7. CONSTRUCT RESPONSE
    // ==========================================

    const response: WidgetDataResponse<MyPatientsWidgetData> = {
      data: enrichedPatients,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      timestamp: new Date().toISOString(),
      refreshAfterSeconds: 300, // Refresh every 5 minutes
      events: {
        channels: [
          `my_patients:${currentUser.id}`,     // Patient-specific updates
          `role:${params.role}`,                 // Role-wide updates
          `tenant:${currentUser.organizationId}`, // Tenant-wide updates
        ],
        eventTypes: [
          'patient_assigned',
          'patient_updated',
          'patient_admitted',
          'patient_discharged',
          'triage_priority_changed',
          'alert_triggered',
        ],
      },
    };

    // ==========================================
    // 8. SET CACHE HEADERS & RETURN
    // ==========================================
    
    // Cache for 30-60 seconds, but allow stale-while-revalidate
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    headers.set('Content-Type', 'application/json');

    return NextResponse.json(response, { headers });

  } catch (error) {
    console.error('[GET /api/v1/dashboards/:role/widgets/my-patients]', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export { GET };

// ==========================================
// NEXT STEPS FOR IMPLEMENTATION
// ==========================================

/**
 * TODO:
 * 
 * 1. Import sql from drizzle-orm for count query
 * 2. Add diagnoses table to schema if not present
 * 3. Implement alert detection logic:
 *    - Query lab_results where isAbnormal = true
 *    - Query vital_signs where value is outside normal range
 *    - Query assessment scores for risk levels
 * 4. Add activeConditions count by querying diagnoses
 * 5. Implement nextAppointment by querying encounters for future dates
 * 6. Add audit logging: log every access to /dashboards endpoint
 * 7. Add error handling for timezone conversion
 * 8. Add input validation for query parameters
 * 9. Add rate limiting to prevent dashboard refresh abuse
 * 10. Add database indexes for query optimization:
 *     - CREATE INDEX idx_patients_tenant_primary_doctor ON patients(tenant_id, primary_doctor_id)
 *     - CREATE INDEX idx_encounters_patient_start_time ON encounters(patient_id, start_time DESC)
 * 11. Add caching layer (Redis) to avoid repeated DB queries
 * 12. Add metrics tracking: count API calls, response time, cache hits
 */
