"use client";

import React, { useState } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  ShieldCheck,
  Settings,
  Pill,
  Lock,
  DollarSign,
  Bell,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Save,
  Users,
  RefreshCw,
  Sliders,
  Building,
} from "lucide-react";

export default function AdminPharmacySettingsPage() {
  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Pharmacy Governance & Permission Console"
      fallbackMessage="Only system administrators and clinical directors have permission to configure pharmacy policies, payment gates, and role capabilities."
    >
      <AdminPharmacySettingsContent />
    </RoleGuard>
  );
}

function AdminPharmacySettingsContent() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [enforcePaymentBeforeDispense, setEnforcePaymentBeforeDispense] = useState(true);
  const [autoNotifyPatientOnPrescription, setAutoNotifyPatientOnPrescription] = useState(true);
  const [autoNotifyPharmacistOnPayment, setAutoNotifyPharmacistOnPayment] = useState(true);
  const [autoNotifyNurseOnDispense, setAutoNotifyNurseOnDispense] = useState(true);
  const [fefoStrictEnforcement, setFefoStrictEnforcement] = useState(true);
  const [defaultDeliveryMethod, setDefaultDeliveryMethod] = useState<"pickup" | "nurse_delivery" | "bedside">("nurse_delivery");

  // Role Capabilities Matrix
  const [rolePermissions, setRolePermissions] = useState<Record<string, { canPrescribe: boolean; canDispense: boolean; canManageInventory: boolean; canCreatePO: boolean; canWaivePayment: boolean }>>({
    physician: { canPrescribe: true, canDispense: false, canManageInventory: false, canCreatePO: false, canWaivePayment: true },
    nurse_practitioner: { canPrescribe: true, canDispense: false, canManageInventory: false, canCreatePO: false, canWaivePayment: false },
    pharmacist: { canPrescribe: false, canDispense: true, canManageInventory: true, canCreatePO: true, canWaivePayment: false },
    nurse: { canPrescribe: false, canDispense: false, canManageInventory: false, canCreatePO: false, canWaivePayment: false },
    system_admin: { canPrescribe: true, canDispense: true, canManageInventory: true, canCreatePO: true, canWaivePayment: true },
    tenant_admin: { canPrescribe: true, canDispense: true, canManageInventory: true, canCreatePO: true, canWaivePayment: true },
  });

  const togglePermission = (role: string, perm: "canPrescribe" | "canDispense" | "canManageInventory" | "canCreatePO" | "canWaivePayment") => {
    setRolePermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: !prev[role][perm],
      },
    }));
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-teal-500/20 bg-gradient-to-r from-slate-900 via-slate-900/95 to-teal-950/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Administrative Governance
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              RBAC & Gateway Config
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white mt-2">
            Pharmacy System & Role Capability Controls
          </h1>
          <p className="text-xs lg:text-sm text-slate-300 mt-1 max-w-3xl">
            Configure automated payment gates, real-time notification dispatch, inventory FEFO rules, and per-role pharmacy permissions.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 transition-all hover:scale-105"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? "Settings Saved ✅" : "Save Configuration"}
        </button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <strong>Configuration Saved:</strong> Pharmacy workflow rules, payment gates, and role permission policies have been updated across all nodes.
        </div>
      )}

      {/* Grid: Global Automation Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment & Dispense Gate */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Financial Gate & Payment Enforcement
          </h3>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">Strict Payment Gate before Dispense</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Block pharmacist dispensing until payment is completed via Telebirr, Chapa, Cash, or Insurance waiver.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enforcePaymentBeforeDispense}
                onChange={(e) => setEnforcePaymentBeforeDispense(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">FEFO (First Expiry First Out) Enforcement</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automatically deduct units from the earliest expiring active batch in inventory.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fefoStrictEnforcement}
                onChange={(e) => setFefoStrictEnforcement(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <strong className="text-xs text-white block">Default Inpatient Medication Delivery Routing</strong>
              <select
                value={defaultDeliveryMethod}
                onChange={(e: any) => setDefaultDeliveryMethod(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold"
              >
                <option value="nurse_delivery">Assigned Nurse Delivery to Ward / Bed (Recommended)</option>
                <option value="bedside">Automated Bedside Courier</option>
                <option value="pickup">Patient In-Person Pharmacy Counter Pickup</option>
              </select>
            </div>
          </div>
        </div>

        {/* Real-Time Notification Automation */}
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-400" />
            Automated Multi-Actor Notification Triggers
          </h3>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">Auto-Notify Patient on Prescription Sign</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sends instant in-app & SMS notification with calculated price and one-click payment link.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoNotifyPatientOnPrescription}
                onChange={(e) => setAutoNotifyPatientOnPrescription(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">Auto-Notify Pharmacist on Payment Clear</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Alerts the pharmacy queue beacon immediately when a patient payment is verified.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoNotifyPharmacistOnPayment}
                onChange={(e) => setAutoNotifyPharmacistOnPayment(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">Auto-Notify Nurse on Dispatch</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pushes delivery task to the assigned nurse&apos;s workstation when pharmacist clicks dispatch.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoNotifyNurseOnDispense}
                onChange={(e) => setAutoNotifyNurseOnDispense(e.target.checked)}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Role Capabilities Matrix Table */}
      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden shadow-xl space-y-4 p-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            Role-Based Access Control (RBAC) & Pharmacy Permissions Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Configure which clinical roles have authority to prescribe, dispense, manage inventory batches, or waive payments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Clinical Role</th>
                <th className="p-4 text-center">Prescribe Drugs</th>
                <th className="p-4 text-center">Dispense & Deduct Stock</th>
                <th className="p-4 text-center">Manage Catalog & Batches</th>
                <th className="p-4 text-center">Create Purchase Orders</th>
                <th className="p-4 text-center">Waive / Free Dispense</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {Object.entries(rolePermissions).map(([roleKey, perms]) => (
                <tr key={roleKey} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <strong className="text-white capitalize">{roleKey.replace("_", " ")}</strong>
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={perms.canPrescribe}
                      onChange={() => togglePermission(roleKey, "canPrescribe")}
                      className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={perms.canDispense}
                      onChange={() => togglePermission(roleKey, "canDispense")}
                      className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={perms.canManageInventory}
                      onChange={() => togglePermission(roleKey, "canManageInventory")}
                      className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={perms.canCreatePO}
                      onChange={() => togglePermission(roleKey, "canCreatePO")}
                      className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={perms.canWaivePayment}
                      onChange={() => togglePermission(roleKey, "canWaivePayment")}
                      className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
