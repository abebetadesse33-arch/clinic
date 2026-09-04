import { db } from "@/db";
import { securityThreatLogs } from "@/db/schema";

export interface AccessEvent {
  tenantId: string;
  userId: string;
  userDepartment?: string;
  userRole: string;
  targetPatientId: string;
  targetPatientDepartment?: string;
  action: "view_chart" | "export_records" | "bulk_query" | "modify_medication";
  recordsCount?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

export interface ThreatAnalysisResult {
  isThreatDetected: boolean;
  threatLevel: "none" | "low" | "medium" | "high" | "critical";
  threatType?: "anomalous_record_access" | "bulk_phi_exfiltration" | "after_hours_login" | "privilege_escalation_attempt";
  reason?: string;
  actionTaken: "allow" | "challenge_mfa" | "block_and_alert";
}

export async function analyzeAccessEvent(event: AccessEvent): Promise<ThreatAnalysisResult> {
  const eventTime = event.timestamp || new Date();
  const hour = eventTime.getHours();

  // 1. Bulk PHI Exfiltration Detection
  if (event.action === "export_records" && (event.recordsCount || 0) > 50) {
    await logSecurityThreat({
      tenantId: event.tenantId,
      userId: event.userId,
      threatType: "bulk_phi_exfiltration",
      severity: "high",
      description: `User attempted bulk export of ${event.recordsCount} patient records. Triggered DLP block and compliance alert.`,
      metadata: { event },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });

    return {
      isThreatDetected: true,
      threatLevel: "high",
      threatType: "bulk_phi_exfiltration",
      reason: `Bulk PHI export limit exceeded (${event.recordsCount} records). Step-up authentication & compliance review required.`,
      actionTaken: "block_and_alert",
    };
  }

  // 2. Out-of-Department Patient Record Access Anomaly
  if (
    event.userDepartment &&
    event.targetPatientDepartment &&
    event.userDepartment !== event.targetPatientDepartment &&
    event.userRole !== "system_admin" &&
    event.userRole !== "auditor" &&
    event.userRole !== "care_coordinator"
  ) {
    await logSecurityThreat({
      tenantId: event.tenantId,
      userId: event.userId,
      threatType: "anomalous_record_access",
      severity: "medium",
      description: `Staff member from department '${event.userDepartment}' accessed patient record in '${event.targetPatientDepartment}' without an active referral link.`,
      metadata: { event },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });

    return {
      isThreatDetected: true,
      threatLevel: "medium",
      threatType: "anomalous_record_access",
      reason: `Cross-department access detected (${event.userDepartment} → ${event.targetPatientDepartment}). Logged to Zero-Trust security monitor.`,
      actionTaken: "challenge_mfa",
    };
  }

  // 3. After-Hours Access Alert (Midnight - 5 AM for non-emergency roles)
  if ((hour >= 0 && hour < 5) && !["physician", "nurse", "system_admin"].includes(event.userRole)) {
    await logSecurityThreat({
      tenantId: event.tenantId,
      userId: event.userId,
      threatType: "after_hours_login",
      severity: "low",
      description: `After-hours record access at ${hour}:00 by non-clinical role '${event.userRole}'.`,
      metadata: { event },
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });

    return {
      isThreatDetected: true,
      threatLevel: "low",
      threatType: "after_hours_login",
      reason: "After-hours access detected. Verification logged.",
      actionTaken: "allow",
    };
  }

  return {
    isThreatDetected: false,
    threatLevel: "none",
    actionTaken: "allow",
  };
}

async function logSecurityThreat(threat: {
  tenantId: string;
  userId: string;
  threatType: "anomalous_record_access" | "bulk_phi_exfiltration" | "after_hours_login" | "privilege_escalation_attempt";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.insert(securityThreatLogs).values({
      tenantId: threat.tenantId,
      userId: threat.userId,
      threatType: threat.threatType,
      severity: threat.severity,
      description: threat.description,
      metadata: threat.metadata || {},
      ipAddress: threat.ipAddress || null,
      userAgent: threat.userAgent || null,
    });
  } catch (e) {
    console.error("Failed to log security threat:", e);
  }
}

export function generateDlpWatermark(userId: string, userEmail: string, ipAddress?: string): string {
  const timestamp = new Date().toISOString();
  return `CONFIDENTIAL PHI — ACCESSED BY ${userEmail} (${userId}) — IP: ${ipAddress || "127.0.0.1"} — ${timestamp} — UNAUTHORIZED EXPORT IS A HIPAA/GDPR VIOLATION`;
}
