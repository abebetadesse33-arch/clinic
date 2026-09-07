"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiResponse } from "./client";
import {
  CreatePatientInput,
  CreateVitalInput,
  CreatePrescriptionInput,
  CreateLabOrderInput,
  CreateLabResultInput,
  CreateMedicationInput,
  CreateAppointmentInput,
  CreateCarePlanInput,
  CreateTaskInput,
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateStockMovementInput,
  CreatePurchaseOrderInput,
  CreateLabQcRunInput,
  CreateImagingReportInput,
  CreateDeviceReadingInput,
  CreateSupportTicketInput,
} from "../validations/schemas";

/**
 * Generic fetcher hook with caching, loading state, error handling, and manual refetch.
 */
export function useFetch<T = any>(endpoint: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const res = await apiClient<T>(endpoint);
    if (res.success && res.data !== undefined) {
      setData(res.data);
    } else {
      setIsError(true);
      setError(res.error || "Failed to load data");
    }
    setIsLoading(false);
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...deps]);

  return { data, isLoading, isError, error, refetch: fetchData, setData };
}

// ==========================================
// 1. PATIENT HOOKS
// ==========================================
export function usePatients(params?: { search?: string; priority?: string; page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.priority && params.priority !== "all") qs.set("priority", params.priority);
  if (params?.page) qs.set("page", params.page.toString());
  if (params?.limit) qs.set("limit", params.limit.toString());

  const queryStr = qs.toString() ? `?${qs.toString()}` : "";
  const endpoint = `/api/v1/patients${queryStr}`;

  return useFetch<any[]>(endpoint, [params?.search, params?.priority, params?.page]);
}

export function usePatient(id: string | null) {
  return useFetch<any>(id ? `/api/v1/patients/${id}` : null, [id]);
}

export async function createPatient(input: CreatePatientInput) {
  return apiClient("/api/v1/patients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePatient(id: string, input: Partial<CreatePatientInput>) {
  return apiClient(`/api/v1/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 2. VITALS HOOKS
// ==========================================
export function useVitals(patientId?: string) {
  const endpoint = patientId ? `/api/v1/vitals?patientId=${patientId}` : "/api/v1/vitals";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createVital(input: CreateVitalInput) {
  return apiClient("/api/v1/vitals", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 3. PRESCRIPTION & PHARMACY HOOKS
// ==========================================
export function usePrescriptions(patientId?: string) {
  const endpoint = patientId ? `/api/v1/prescriptions?patientId=${patientId}` : "/api/v1/prescriptions";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createPrescription(input: CreatePrescriptionInput) {
  return apiClient("/api/v1/prescriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function dispensePrescription(rxId: string, batchId?: string, notes?: string) {
  return apiClient(`/api/v1/prescriptions/${rxId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "dispense", batchId, notes }),
  });
}

export function usePharmacyInventory() {
  return useFetch<{
    inventory: any[];
    batches: any[];
    suppliers: any[];
    recentMovements: any[];
  }>("/api/v1/pharmacy/inventory");
}

export async function createStockMovement(input: CreateStockMovementInput) {
  return apiClient("/api/v1/pharmacy/inventory", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return apiClient("/api/v1/pharmacy/purchase-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 4. LAB ORDERS & RESULTS HOOKS
// ==========================================
export function useLabOrders(patientId?: string) {
  const endpoint = patientId ? `/api/v1/lab-orders?patientId=${patientId}` : "/api/v1/lab-orders";
  return useFetch<any[]>(endpoint, [patientId]);
}

export function useLabResults(patientId?: string) {
  const endpoint = patientId ? `/api/v1/lab-results?patientId=${patientId}` : "/api/v1/lab-results";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createLabOrder(input: CreateLabOrderInput) {
  return apiClient("/api/v1/lab-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createLabResult(input: CreateLabResultInput) {
  return apiClient("/api/v1/lab-results", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 5. APPOINTMENTS & SCHEDULING HOOKS
// ==========================================
export function useAppointments(patientId?: string) {
  const endpoint = patientId ? `/api/v1/appointments?patientId=${patientId}` : "/api/v1/appointments";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createAppointment(input: CreateAppointmentInput) {
  return apiClient("/api/v1/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateAppointmentStatus(id: string, status: string, notes?: string) {
  return apiClient(`/api/v1/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

// ==========================================
// 6. CARE PLANS & TASKS HOOKS
// ==========================================
export function useCarePlans(patientId?: string) {
  const endpoint = patientId ? `/api/v1/care-plans?patientId=${patientId}` : "/api/v1/care-plans";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createCarePlan(input: CreateCarePlanInput) {
  return apiClient("/api/v1/care-plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCarePlan(id: string, updates: any) {
  return apiClient(`/api/v1/care-plans/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function useTasks(role?: string, patientId?: string) {
  const qs = new URLSearchParams();
  if (role) qs.set("role", role);
  if (patientId) qs.set("patientId", patientId);
  const endpoint = `/api/v1/tasks${qs.toString() ? `?${qs.toString()}` : ""}`;
  return useFetch<any[]>(endpoint, [role, patientId]);
}

export async function createTask(input: CreateTaskInput) {
  return apiClient("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTaskStatus(id: string, status: string) {
  return apiClient(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ==========================================
// 7. INVOICING & PAYMENTS HOOKS
// ==========================================
export function useInvoices(patientId?: string) {
  const endpoint = patientId ? `/api/v1/invoices?patientId=${patientId}` : "/api/v1/invoices";
  return useFetch<any[]>(endpoint, [patientId]);
}

export async function createInvoice(input: CreateInvoiceInput) {
  return apiClient("/api/v1/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function processPayment(input: CreatePaymentInput) {
  return apiClient("/api/v1/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 8. AUDIT LOGS HOOKS
// ==========================================
export function useAuditLogs(params?: { search?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.action && params.action !== "all") qs.set("action", params.action);
  if (params?.entityType && params.entityType !== "all") qs.set("entityType", params.entityType);
  if (params?.startDate) qs.set("startDate", params.startDate);
  if (params?.endDate) qs.set("endDate", params.endDate);

  const endpoint = `/api/v1/audit-logs${qs.toString() ? `?${qs.toString()}` : ""}`;
  return useFetch<any[]>(endpoint, [params?.search, params?.action, params?.entityType, params?.startDate, params?.endDate]);
}

// ==========================================
// 9. LIS, RIS & DEVICES HOOKS
// ==========================================
export function useLisData() {
  return useFetch<{ instruments: any[]; recentQcRuns: any[] }>("/api/v1/lis/instruments");
}

export async function createLabQcRun(input: CreateLabQcRunInput) {
  return apiClient("/api/v1/lis/qc-runs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useRisStudies(patientId?: string) {
  const endpoint = patientId ? `/api/v1/ris/imaging-studies?patientId=${patientId}` : "/api/v1/ris/imaging-studies";
  return useFetch<{ studies: any[]; templates: any[] }>(endpoint, [patientId]);
}

export async function createImagingReport(input: CreateImagingReportInput) {
  return apiClient("/api/v1/ris/imaging-reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useDevices(patientId?: string) {
  const endpoint = patientId ? `/api/v1/devices?patientId=${patientId}` : "/api/v1/devices";
  return useFetch<{ devices: any[]; programs: any[]; recentReadings: any[] }>(endpoint, [patientId]);
}

export async function createDeviceReading(input: CreateDeviceReadingInput) {
  return apiClient("/api/v1/devices/readings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ==========================================
// 10. SUPPORT TICKETS & CLINICAL DECISION SUPPORT
// ==========================================
export function useSupportTickets(status?: string) {
  const endpoint = status && status !== "all" ? `/api/v1/support-tickets?status=${status}` : "/api/v1/support-tickets";
  return useFetch<any[]>(endpoint, [status]);
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  return apiClient("/api/v1/support-tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function evaluateClinicalDecisionSupport(candidateDrug: string, patientId: string, weightKg?: number, age?: number) {
  return apiClient("/api/v1/ai/cds", {
    method: "POST",
    body: JSON.stringify({ candidateDrug, patientId, weightKg, age }),
  });
}
