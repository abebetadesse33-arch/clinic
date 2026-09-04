import { z } from "zod";

// ==========================================
// 1. PATIENT VALIDATIONS
// ==========================================
export const allergySchema = z.object({
  substance: z.string().min(1, "Allergy substance is required"),
  severity: z.enum(["mild", "moderate", "severe", "anaphylactic"]).default("moderate"),
  reaction: z.string().default("General reaction"),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be YYYY-MM-DD"),
  gender: z.enum(["male", "female", "other"]),
  bloodType: z.string().optional().default("O+"),
  phone: z.string().optional().default("+251 91 100 0000"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  allergies: z.array(allergySchema).default([]),
  emergencyContact: z.string().optional().default("Emergency Contact on file"),
  primaryDoctorId: z.string().uuid().optional(),
  triagePriority: z.enum(["routine", "urgent", "critical"]).default("routine"),
  avatar: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// ==========================================
// 2. VITALS VALIDATIONS
// ==========================================
export const createVitalSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  encounterId: z.string().uuid().optional(),
  systolicBp: z.number().int().min(40).max(300),
  diastolicBp: z.number().int().min(20).max(200),
  heartRate: z.number().int().min(20).max(250),
  respiratoryRate: z.number().int().min(5).max(80),
  temperatureC: z.number().min(30).max(45),
  oxygenSaturation: z.number().min(50).max(100),
  bmi: z.number().optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  painScore: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export type CreateVitalInput = z.infer<typeof createVitalSchema>;

// ==========================================
// 3. PRESCRIPTION & MEDICATION VALIDATIONS
// ==========================================
export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  encounterId: z.string().uuid().optional(),
  medicationName: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  route: z.string().default("Oral"),
  durationDays: z.number().int().min(1).default(30),
  indication: z.string().optional().default("Therapeutic Treatment"),
  dispenseQuantity: z.number().int().min(1).default(30),
  refills: z.number().int().min(0).default(0),
  prescriberNotes: z.string().optional(),
  isUrgent: z.boolean().default(false),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const createMedicationSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  route: z.string().default("Oral"),
  indication: z.string().optional().default("Chronic Condition"),
  startDate: z.string().optional().default(new Date().toISOString().substring(0, 10)),
  isActive: z.boolean().default(true),
  pharmacistVerified: z.boolean().default(true),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;

// ==========================================
// 4. LAB ORDERS & RESULTS VALIDATIONS
// ==========================================
export const createLabOrderSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  doctorId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  testName: z.string().min(1, "Test name is required"),
  category: z.string().default("routine_chemistry"),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  clinicalReason: z.string().optional(),
  fastingRequired: z.boolean().default(false),
});

export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;

export const createLabResultSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  labOrderId: z.string().uuid().optional(),
  testName: z.string().min(1, "Test name is required"),
  category: z.string().default("Chemistry"),
  value: z.string().min(1, "Result value is required"),
  unit: z.string().min(1, "Unit is required"),
  referenceRangeLow: z.number().optional(),
  referenceRangeHigh: z.number().optional(),
  isAbnormal: z.boolean().default(false),
  interpretation: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;

// ==========================================
// 5. APPOINTMENTS & SCHEDULING VALIDATIONS
// ==========================================
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  clinicianId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
  appointmentType: z.preprocess(
    (val) => (typeof val === "string" ? val.replace(/-/g, "_") : val),
    z.enum(["in_person", "telehealth", "mobile_clinic", "home_visit", "follow_up"]).default("in_person")
  ),
  specialty: z.string().default("Internal Medicine"),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  scheduledTime: z.string().min(1, "Time is required"),
  durationMinutes: z.number().int().min(5).default(30),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// ==========================================
// 6. CARE PLANS & TASKS VALIDATIONS
// ==========================================
export const carePlanInterventionSchema = z.object({
  id: z.string().optional(),
  category: z.enum(["pharmacotherapy", "nutrition", "rehabilitation", "sdoh", "behavioral", "nursing", "monitoring"]),
  description: z.string().min(1, "Description is required"),
  assignedRole: z.string().min(1, "Assigned role is required"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  targetDate: z.string().optional(),
});

export const createCarePlanSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  encounterId: z.string().uuid().optional(),
  primaryDiagnosis: z.string().min(1, "Primary diagnosis is required"),
  goals: z.array(z.string()).default([]),
  interventions: z.array(carePlanInterventionSchema).default([]),
  barriersIdentified: z.array(z.string()).default([]),
});

export type CreateCarePlanInput = z.infer<typeof createCarePlanSchema>;

export const createTaskSchema = z.object({
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assignedRole: z.string().min(1, "Assigned role is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  category: z.string().default("clinical_care"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// ==========================================
// 7. INVOICING & PAYMENT VALIDATIONS
// ==========================================
export const lineItemSchema = z.object({
  description: z.string().min(1, "Item description required"),
  category: z.string().default("Consultation"),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid("Valid Patient UUID required"),
  encounterId: z.string().uuid().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item required"),
  subtotal: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  currency: z.string().default("ETB"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid("Valid Invoice UUID required"),
  patientId: z.string().uuid("Valid Patient UUID required"),
  amount: z.number().min(0.01, "Payment amount must be greater than 0"),
  currency: z.string().default("ETB"),
  paymentMethod: z.enum(["telebirr", "chapa", "bank_transfer", "cash", "insurance_copay", "paypal"]),
  transactionReference: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

// ==========================================
// 8. PHARMACY INVENTORY VALIDATIONS
// ==========================================
export const createStockMovementSchema = z.object({
  batchId: z.string().uuid("Valid Batch UUID required"),
  movementType: z.enum(["receive", "dispense", "transfer", "return", "adjustment", "quarantine_disposal"]),
  quantity: z.number().int(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Valid Supplier UUID required"),
  items: z.array(
    z.object({
      drugId: z.string().uuid(),
      genericName: z.string(),
      quantity: z.number().int().min(1),
      unitCost: z.number().min(0),
      totalCost: z.number().min(0),
    })
  ).min(1),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

// ==========================================
// 9. LIS, RIS & DEVICES VALIDATIONS
// ==========================================
export const createLabQcRunSchema = z.object({
  instrumentId: z.string().uuid("Valid Instrument UUID required"),
  analyte: z.string().min(1),
  level: z.enum(["level_1_low", "level_2_normal", "level_3_high"]).default("level_2_normal"),
  measuredValue: z.number(),
  expectedMean: z.number(),
  standardDeviation: z.number(),
  referenceRangeLow: z.number(),
  referenceRangeHigh: z.number(),
  notes: z.string().optional(),
});

export type CreateLabQcRunInput = z.infer<typeof createLabQcRunSchema>;

export const createImagingReportSchema = z.object({
  studyId: z.string().uuid("Valid Study UUID required"),
  technique: z.string().min(1, "Technique required"),
  findings: z.string().min(1, "Findings required"),
  impression: z.string().min(1, "Impression required"),
  recommendations: z.string().optional(),
  isCriticalFinding: z.boolean().default(false),
});

export type CreateImagingReportInput = z.infer<typeof createImagingReportSchema>;

export const createDeviceReadingSchema = z.object({
  deviceId: z.string().uuid("Valid Device UUID required"),
  patientId: z.string().uuid("Valid Patient UUID required"),
  metricType: z.string().min(1),
  numericValue: z.number(),
  unit: z.string().min(1),
});

export type CreateDeviceReadingInput = z.infer<typeof createDeviceReadingSchema>;

// ==========================================
// 10. SUPPORT TICKETS & AUDIT VALIDATIONS
// ==========================================
export const createSupportTicketSchema = z.object({
  patientId: z.string().uuid().optional(),
  category: z.enum(["it_system", "clinical_cdss", "billing_payment", "pharmacy_dispensing", "telehealth_audio_video", "patient_portal"]),
  priority: z.enum(["low", "normal", "high", "critical_urgent"]).default("normal"),
  title: z.string().min(1, "Ticket title is required"),
  description: z.string().min(1, "Ticket description is required"),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const createAuditLogSchema = z.object({
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  summary: z.string().min(1),
  details: z.record(z.any()).optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
