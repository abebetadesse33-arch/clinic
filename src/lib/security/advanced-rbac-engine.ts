/**
 * Advanced RBAC & Security Manager
 * Fine-grained access control with attribute-based authorization (ABAC)
 */

export interface RBACPolicy {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  rules: AccessRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccessRule {
  resource: string;
  action: string; // create, read, update, delete, execute
  conditions?: RuleCondition[];
  effect: "allow" | "deny";
  priority: number;
}

export interface RuleCondition {
  attribute: string; // user attribute
  operator: "equals" | "contains" | "in" | "greater_than" | "less_than";
  value: string | string[] | number;
}

export interface AccessContext {
  userId: string;
  userRoles: string[];
  organizationId: string;
  tenantId?: string;
  userAttributes?: Record<string, unknown>;
  resourceId?: string;
  resourceType?: string;
  action: string;
}

/**
 * Advanced RBAC Engine
 */
export class AdvancedRBACEngine {
  private policies: Map<string, RBACPolicy> = new Map();
  private roleHierarchy: Map<string, string[]> = new Map(); // role -> parent roles
  private auditLog: AuditLogEntry[] = [];
  private readonly maxAuditEntries = 10000;

  /**
   * Evaluate access request
   */
  async evaluateAccess(context: AccessContext): Promise<AccessDecision> {
    const startTime = Date.now();

    try {
      // Get all roles including inherited ones
      const allRoles = this.expandRoles(context.userRoles);

      // Find matching policies
      const matchingPolicies = this.findMatchingPolicies(
        context.organizationId,
        context.resourceType || "",
        context.action
      );

      // Evaluate policies
      let decision: "allow" | "deny" | "abstain" = "abstain";
      let matchedRules: AccessRule[] = [];

      for (const policy of matchingPolicies) {
        if (!policy.enabled) continue;

        const rules = policy.rules.sort((a, b) => b.priority - a.priority);

        for (const rule of rules) {
          if (this.ruleMatches(rule, allRoles, context)) {
            matchedRules.push(rule);

            if (rule.effect === "deny") {
              decision = "deny";
              break;
            } else if (rule.effect === "allow" && decision !== "deny") {
              decision = "allow";
            }
          }
        }

        if (decision === "deny") break;
      }

      // Log access decision
      const logEntry: AuditLogEntry = {
        timestamp: new Date(),
        userId: context.userId,
        organizationId: context.organizationId,
        action: context.action,
        resource: context.resourceType || "",
        resourceId: context.resourceId,
        decision,
        reason:
          matchedRules.length > 0
            ? `Matched rules: ${matchedRules.map((r) => r.action).join(", ")}`
            : "No matching policies",
        duration: Date.now() - startTime,
      };

      this.addAuditLog(logEntry);

      return {
        allowed: decision === "allow",
        decision,
        reason: logEntry.reason,
        matchedRules,
        evaluationTime: logEntry.duration,
      };
    } catch (error) {
      // Log error but don't fail - default to deny
      console.error("RBAC evaluation error:", error);
      this.addAuditLog({
        timestamp: new Date(),
        userId: context.userId,
        organizationId: context.organizationId,
        action: context.action,
        resource: context.resourceType || "",
        resourceId: context.resourceId,
        decision: "deny",
        reason: `Evaluation error: ${error}`,
        duration: Date.now() - startTime,
      });

      return {
        allowed: false,
        decision: "deny",
        reason: "Access evaluation failed",
        matchedRules: [],
        evaluationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Expand role hierarchy
   */
  private expandRoles(roles: string[]): string[] {
    const expanded = new Set(roles);
    const queue = [...roles];

    while (queue.length > 0) {
      const role = queue.shift();
      if (!role) continue;

      const parents = this.roleHierarchy.get(role) || [];
      parents.forEach((parent) => {
        if (!expanded.has(parent)) {
          expanded.add(parent);
          queue.push(parent);
        }
      });
    }

    return Array.from(expanded);
  }

  /**
   * Find policies matching criteria
   */
  private findMatchingPolicies(
    organizationId: string,
    resourceType: string,
    action: string
  ): RBACPolicy[] {
    const matching: RBACPolicy[] = [];

    this.policies.forEach((policy) => {
      if (policy.organizationId !== organizationId) return;

      const hasMatchingRule = policy.rules.some(
        (rule) =>
          this.resourceMatches(rule.resource, resourceType) &&
          this.actionMatches(rule.action, action)
      );

      if (hasMatchingRule) {
        matching.push(policy);
      }
    });

    return matching;
  }

  /**
   * Check if rule matches context
   */
  private ruleMatches(
    rule: AccessRule,
    userRoles: string[],
    context: AccessContext
  ): boolean {
    // Check conditions if any
    if (rule.conditions && rule.conditions.length > 0) {
      return rule.conditions.every((condition) =>
        this.evaluateCondition(condition, context)
      );
    }

    return true;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    condition: RuleCondition,
    context: AccessContext
  ): boolean {
    const userValue = context.userAttributes?.[condition.attribute];

    switch (condition.operator) {
      case "equals":
        return userValue === condition.value;
      case "contains":
        return String(userValue).includes(String(condition.value));
      case "in":
        return (condition.value as any[]).includes(userValue);
      case "greater_than":
        return Number(userValue) > Number(condition.value);
      case "less_than":
        return Number(userValue) < Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Check resource match with wildcards
   */
  private resourceMatches(pattern: string, resource: string): boolean {
    if (pattern === "*") return true;
    if (pattern === resource) return true;

    // Support wildcards like "patient:*" or "patient:appointments:*"
    const patternParts = pattern.split(":");
    const resourceParts = resource.split(":");

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "*") return true;
      if (patternParts[i] !== resourceParts[i]) return false;
    }

    return true;
  }

  /**
   * Check action match
   */
  private actionMatches(pattern: string, action: string): boolean {
    if (pattern === "*") return true;
    return pattern === action;
  }

  /**
   * Add role inheritance
   */
  setRoleHierarchy(role: string, parentRoles: string[]): void {
    this.roleHierarchy.set(role, parentRoles);
  }

  /**
   * Add or update policy
   */
  setPolicy(policy: RBACPolicy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Get audit log
   */
  getAuditLog(filters?: {
    userId?: string;
    organizationId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let logs = this.auditLog;

    if (filters?.userId) {
      logs = logs.filter((l) => l.userId === filters.userId);
    }
    if (filters?.organizationId) {
      logs = logs.filter((l) => l.organizationId === filters.organizationId);
    }
    if (filters?.startTime) {
      logs = logs.filter((l) => l.timestamp >= filters.startTime!);
    }
    if (filters?.endTime) {
      logs = logs.filter((l) => l.timestamp <= filters.endTime!);
    }

    // Return most recent first, limited
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, filters?.limit || 100);
  }

  /**
   * Add audit log entry
   */
  private addAuditLog(entry: AuditLogEntry): void {
    this.auditLog.push(entry);

    // Trim if exceeds max size
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }
  }
}

export interface AccessDecision {
  allowed: boolean;
  decision: "allow" | "deny" | "abstain";
  reason: string;
  matchedRules: AccessRule[];
  evaluationTime: number;
}

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  decision: "allow" | "deny" | "abstain";
  reason: string;
  duration: number;
}

// Singleton instance
export const rbacEngine = new AdvancedRBACEngine();

// Configure default role hierarchy
rbacEngine.setRoleHierarchy("admin", ["staff"]);
rbacEngine.setRoleHierarchy("physician", ["staff"]);
rbacEngine.setRoleHierarchy("nurse", ["staff"]);
rbacEngine.setRoleHierarchy("staff", []);
rbacEngine.setRoleHierarchy("patient", []);
