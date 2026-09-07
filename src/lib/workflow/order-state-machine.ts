/**
 * ═══════════════════════════════════════════════════════════════════
 * CLINICAL ORDER FINITE STATE MACHINE
 * ═══════════════════════════════════════════════════════════════════
 * Guarantees closed-loop clinical integrity. State jumps (e.g. ordered -> completed)
 * without intermediate specimen collection or pathologist verification are rejected.
 * ═══════════════════════════════════════════════════════════════════
 */

export type OrderStatus =
  | "draft"
  | "ordered"
  | "pending_collection"
  | "specimen_received"
  | "in_analysis"
  | "preliminary"
  | "final_verified"
  | "reviewed_by_provider"
  | "closed"
  | "cancelled";

export const ORDER_LIFECYCLE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["ordered", "cancelled"],
  ordered: ["pending_collection", "specimen_received", "cancelled"],
  pending_collection: ["specimen_received", "cancelled"],
  specimen_received: ["in_analysis", "cancelled"],
  in_analysis: ["preliminary", "final_verified", "cancelled"],
  preliminary: ["final_verified", "cancelled"],
  final_verified: ["reviewed_by_provider"],
  reviewed_by_provider: ["closed"],
  cancelled: [],
  closed: [],
};

export function validateStateTransition(currentStatus: string, nextStatus: string): boolean {
  const allowed = ORDER_LIFECYCLE_TRANSITIONS[currentStatus as OrderStatus] || [];
  return allowed.includes(nextStatus as OrderStatus);
}

export function isTerminalStatus(status: string): boolean {
  return status === "closed" || status === "cancelled";
}
