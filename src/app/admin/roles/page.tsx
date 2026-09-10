"use client";

import React, { useState, useEffect, useCallback } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  ShieldCheck, Plus, Edit2, Trash2, UserPlus, Users, Check,
  ChevronDown, ChevronRight, Lock, Unlock, Search, X, Briefcase,
  Stethoscope, DollarSign, Package, HeartPulse, Settings, Save,
  BadgeCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Permission = string;

type Role = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
};

type Assignment = {
  id: string;
  userId: string;
  roleId: string;
  userName: string;
  userEmail: string;
  roleName: string;
  roleCode: string;
  roleCategory: string;
};

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
};

// ─── Permission catalogue ─────────────────────────────────────────────────────
const PERMISSIONS_CATALOGUE: Record<string, string[]> = {
  "Clinical Access": [
    "view_patient_records", "create_encounter", "sign_prescriptions",
    "order_lab_tests", "order_imaging", "create_care_plan", "discharge_patient",
  ],
  "Pharmacy & Medication": [
    "dispense_medication", "manage_drug_catalog", "receive_batches",
    "create_purchase_orders", "view_inventory_alerts", "quarantine_stock",
    "waive_payment_gate",
  ],
  "Finance & Billing": [
    "process_pos_payments", "view_patient_billing", "open_cashier_shift",
    "close_cashier_shift", "print_receipts", "apply_discounts",
    "manage_general_ledger", "manage_accounts_payable", "approve_refunds",
    "export_financial_ledgers", "view_financial_reports", "manage_budgets",
    "adjudicate_claims", "verify_preauth", "manage_claim_disputes",
    "export_claim_reports", "verify_insurance_policies",
  ],
  "HR & Staff Management": [
    "manage_staff_profiles", "approve_leave", "process_payroll",
    "verify_medical_licenses", "manage_shifts", "view_staff_attendance",
    "create_duty_rosters", "run_performance_reviews",
  ],
  "Administration": [
    "manage_roles", "assign_roles", "manage_workflows", "view_audit_logs",
    "manage_system_settings", "export_reports", "verify_blockchain_audit",
    "manage_facilities",
  ],
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  clinical: <Stethoscope size={14} />,
  finance: <DollarSign size={14} />,
  billing: <DollarSign size={14} />,
  hr: <Users size={14} />,
  pharmacy: <Package size={14} />,
  admin: <Settings size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  clinical: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  finance: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  billing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hr: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  pharmacy: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  admin: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [tab, setTab] = useState<"roles" | "assignments">("roles");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);

  // Form state
  const [form, setForm] = useState({
    code: "", name: "", description: "", category: "clinical", permissions: [] as string[],
  });
  const [assignForm, setAssignForm] = useState({ userId: "", roleId: "" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, assignRes, staffRes] = await Promise.all([
        fetch("/api/v1/admin/roles?view=roles"),
        fetch("/api/v1/admin/roles?view=assignments"),
        fetch("/api/v1/admin/roles?view=staff"),
      ]);
      const [rd, ad, sd] = await Promise.all([rolesRes.json(), assignRes.json(), staffRes.json()]);
      if (rd.success) setRoles(rd.data);
      if (ad.success) setAssignments(ad.data);
      if (sd.success) setStaff(sd.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateOrUpdate = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editRole
            ? { action: "update_role", roleId: editRole.id, ...form }
            : { action: "create_role", ...form }
        ),
      });
      setShowCreateModal(false);
      setEditRole(null);
      setForm({ code: "", name: "", description: "", category: "clinical", permissions: [] });
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Delete this custom role?")) return;
    await fetch("/api/v1/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_role", roleId }),
    });
    fetchData();
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      await fetch("/api/v1/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign_role", ...assignForm }),
      });
      setShowAssignModal(false);
      setAssignForm({ userId: "", roleId: "" });
      fetchData();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleRevoke = async (userId: string, roleId: string) => {
    await fetch("/api/v1/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke_role", userId, roleId }),
    });
    fetchData();
  };

  const togglePerm = (perm: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const openEditModal = (role: Role) => {
    setEditRole(role);
    setForm({
      code: role.code,
      name: role.name,
      description: role.description ?? "",
      category: role.category,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setShowCreateModal(true);
  };

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <RoleGuard
      allowedRoles={["system_admin", "tenant_admin"]}
      fallbackTitle="Role Administration"
      fallbackMessage="Only administrators can create, edit, delete, or assign roles."
    >
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Role & Permission Manager</h1>
              <p className="text-slate-400 text-xs">Dynamic RBAC — create, assign, and govern access control</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowAssignModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-sm text-slate-300 transition"
            >
              <UserPlus size={15} /> Assign Role
            </button>
            <button
              onClick={() => { setEditRole(null); setForm({ code: "", name: "", description: "", category: "clinical", permissions: [] }); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm text-white font-medium transition"
            >
              <Plus size={15} /> New Role
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-6 border-t border-slate-800">
          {(["roles", "assignments"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-violet-500 text-violet-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
            >
              {t === "roles" ? "Role Catalogue" : "User Assignments"}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="relative mb-6 w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-500">Loading…</div>
        ) : tab === "roles" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredRoles.map(role => (
              <div key={role.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[role.category] ?? CATEGORY_COLORS.admin}`}>
                      {CATEGORY_ICONS[role.category] ?? <Settings size={12} />}
                      {role.category}
                    </span>
                    {role.isSystem && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1">
                        <Lock size={10} /> System
                      </span>
                    )}
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEditModal(role)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-white font-semibold text-sm mb-1">{role.name}</h3>
                <p className="text-slate-400 text-xs mb-3 line-clamp-2">{role.description}</p>

                <div className="flex flex-wrap gap-1">
                  {(Array.isArray(role.permissions) ? role.permissions : []).slice(0, 4).map(p => (
                    <span key={p} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      {p.replace(/_/g, " ")}
                    </span>
                  ))}
                  {(Array.isArray(role.permissions) ? role.permissions : []).length > 4 && (
                    <span className="text-xs text-slate-500">+{role.permissions.length - 4} more</span>
                  )}
                </div>
              </div>
            ))}

            {filteredRoles.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-500">No roles found. Create one to get started.</div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <div key={a.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold">
                    {a.userName?.charAt(0) ?? "?"}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{a.userName}</p>
                    <p className="text-slate-500 text-xs">{a.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[a.roleCategory] ?? CATEGORY_COLORS.admin}`}>
                    {a.roleName}
                  </span>
                  <button
                    onClick={() => handleRevoke(a.userId, a.roleId)}
                    className="text-xs px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="text-center py-16 text-slate-500">No role assignments found.</div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">{editRole ? "Edit Role" : "Create New Role"}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role Name *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. HR Manager" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Code *</label>
                  <input className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                    value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} placeholder="hr_manager" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                  rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-3">Permissions</label>
                <div className="space-y-3">
                  {Object.entries(PERMISSIONS_CATALOGUE).map(([group, perms]) => (
                    <div key={group}>
                      <button className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-2 hover:text-slate-200 transition"
                        onClick={() => setExpandedPerms(expandedPerms === group ? null : group)}>
                        {expandedPerms === group ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {group}
                        <span className="text-slate-600">({perms.filter(p => form.permissions.includes(p)).length}/{perms.length})</span>
                      </button>
                      {expandedPerms === group && (
                        <div className="grid grid-cols-2 gap-2 pl-4">
                          {perms.map(perm => (
                            <label key={perm} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition text-xs ${form.permissions.includes(perm) ? "bg-violet-500/10 border-violet-500/30 text-violet-300" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"}`}>
                              <input type="checkbox" className="hidden" checked={form.permissions.includes(perm)} onChange={() => togglePerm(perm)} />
                              {form.permissions.includes(perm) ? <Check size={11} className="text-violet-400 shrink-0" /> : <div className="w-[11px] h-[11px] rounded border border-slate-600 shrink-0" />}
                              {perm.replace(/_/g, " ")}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition">Cancel</button>
              <button onClick={handleCreateOrUpdate} disabled={saving || !form.name || !form.code}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition">
                <Save size={14} /> {saving ? "Saving…" : editRole ? "Update Role" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold">Assign Role to Staff</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Staff Member *</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  value={assignForm.userId} onChange={e => setAssignForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.fullName} — {s.role}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Role *</label>
                <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  value={assignForm.roleId} onChange={e => setAssignForm(f => ({ ...f, roleId: e.target.value }))}>
                  <option value="">Select role…</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition">Cancel</button>
              <button onClick={handleAssign} disabled={saving || !assignForm.userId || !assignForm.roleId}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm text-white font-medium transition">
                <BadgeCheck size={14} /> {saving ? "Assigning…" : "Assign Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
