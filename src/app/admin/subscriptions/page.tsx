"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  ChevronRight,
  FileText,
  Percent,
} from "lucide-react";

export default function AdminSubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions" | "invoices">("plans");
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // New Plan Modal State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanType, setNewPlanType] = useState<"individual" | "family" | "company">("family");
  const [newPlanCycle, setNewPlanCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [newPlanPrice, setNewPlanPrice] = useState("1200");
  const [newPlanMaxMembers, setNewPlanMaxMembers] = useState("5");
  const [newPlanExtraPrice, setNewPlanExtraPrice] = useState("200");
  const [newPlanConsultations, setNewPlanConsultations] = useState("10");
  const [newPlanLabTests, setNewPlanLabTests] = useState("5");
  const [newPlanDiscount, setNewPlanDiscount] = useState("20");

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes, invRes] = await Promise.all([
        fetch("/api/v1/admin/subscription-plans").then((r) => r.json()),
        fetch("/api/v1/subscriptions").then((r) => r.json()),
        fetch("/api/v1/subscription-invoices").then((r) => r.json()),
      ]);

      if (plansRes.success) setPlans(plansRes.data);
      if (subsRes.success) setSubscriptions(subsRes.data);
      if (invRes.success) setInvoices(invRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/admin/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlanName,
          type: newPlanType,
          billingCycle: newPlanCycle,
          basePrice: parseFloat(newPlanPrice),
          maxMembers: parseInt(newPlanMaxMembers) || null,
          additionalMemberPrice: parseFloat(newPlanExtraPrice) || 0,
          includedServices: {
            consultations: parseInt(newPlanConsultations) || 0,
            labTests: parseInt(newPlanLabTests) || 0,
            discountPercent: parseInt(newPlanDiscount) || 0,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify("Subscription plan created successfully!");
        setShowPlanModal(false);
        setNewPlanName("");
        loadData();
      } else {
        notify(`Error: ${data.error}`);
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/v1/subscription-invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAsPaid: true, paymentMethod: "bank_transfer" }),
      });
      const data = await res.json();
      if (data.success) {
        notify("Invoice marked as paid and subscription activated!");
        loadData();
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500/90 backdrop-blur border border-emerald-400 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  Subscription & Billing Engine
                </h1>
                <p className="text-sm text-slate-400">
                  Manage family and corporate subscription tiers, quotas, seats, and recurring billing
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-600/25 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Plan Tier</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Plans</span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-white">{plans.length}</div>
            <p className="text-xs text-slate-400 mt-1">Family & Corporate Tiers</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Subscriptions</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {subscriptions.filter((s) => s.subscription?.status === "active").length}
            </div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> 100% Health Status
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Corporate Clients</span>
              <Building2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {subscriptions.filter((s) => s.subscription?.subscriberType === "company").length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Managed Company Accounts</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden backdrop-blur">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Open Invoices</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {invoices.filter((i) => i.invoice?.status === "open").length}
            </div>
            <p className="text-xs text-amber-400 mt-1">Pending Payment Settlement</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab("plans")}
            className={`px-4 py-2.5 font-medium text-sm transition relative ${
              activeTab === "plans" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Subscription Plans ({plans.length})
            {activeTab === "plans" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={`px-4 py-2.5 font-medium text-sm transition relative ${
              activeTab === "subscriptions" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Subscribers & Groups ({subscriptions.length})
            {activeTab === "subscriptions" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2.5 font-medium text-sm transition relative ${
              activeTab === "invoices" ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Invoices & Collections ({invoices.length})
            {activeTab === "invoices" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>

        {/* TAB 1: Subscription Plans */}
        {activeTab === "plans" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 relative hover:border-slate-700 transition flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                        p.type === "family"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : p.type === "company"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {p.type} plan
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{p.billingCycle}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-white">{p.basePrice}</span>
                    <span className="text-sm text-slate-400">{p.currency} / {p.billingCycle}</span>
                  </div>

                  <div className="space-y-2.5 border-t border-slate-800/80 pt-4 text-sm text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Max Included Members</span>
                      <span className="font-medium">{p.maxMembers || "Unlimited"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Free Consultations</span>
                      <span className="font-medium text-emerald-400">
                        {p.includedServices?.consultations === -1 ? "Unlimited" : `${p.includedServices?.consultations || 0} / cycle`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Free Lab Tests</span>
                      <span className="font-medium text-cyan-400">
                        {p.includedServices?.labTests || 0} tests / cycle
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Out-of-quota Discount</span>
                      <span className="font-medium text-indigo-400">
                        {p.includedServices?.discountPercent || 0}% OFF
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500">v{p.version} • Active</span>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Edit Tier →</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Subscribers Master Table */}
        {activeTab === "subscriptions" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Subscriber Entity</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Seats / Members</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Current Period</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map((s) => (
                  <tr key={s.subscription.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-semibold text-white">
                      {s.familyGroup?.name || s.company?.name || "Individual Subscriber"}
                    </td>
                    <td className="p-4">
                      <span className="text-xs capitalize font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                        {s.subscription.subscriberType}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-200">{s.plan.name}</td>
                    <td className="p-4">{s.subscription.seatCount} allocated</td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          s.subscription.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {s.subscription.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(s.subscription.currentPeriodStart).toLocaleDateString()} -{" "}
                      {new Date(s.subscription.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Invoices & Collections */}
        {activeTab === "invoices" && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/90 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((i) => (
                  <tr key={i.invoice.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-4 font-mono font-medium text-indigo-300">{i.invoice.invoiceNumber}</td>
                    <td className="p-4 font-medium text-white">
                      {i.familyGroup?.name || i.company?.name || "Subscriber"}
                    </td>
                    <td className="p-4 font-bold text-white">
                      {i.invoice.totalAmount} {i.invoice.currency}
                    </td>
                    <td className="p-4 uppercase text-xs text-slate-400">{i.invoice.paymentMethod || "telebirr"}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {new Date(i.invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                          i.invoice.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {i.invoice.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {i.invoice.status === "open" && (
                        <button
                          onClick={() => handleMarkInvoicePaid(i.invoice.id)}
                          className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-lg text-xs font-medium transition"
                        >
                          Verify & Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal: Create Plan Tier */}
        {showPlanModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> Create Subscription Plan Tier
                </h3>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Plan Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Family Complete Care or Corporate Enterprise"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Target Entity
                    </label>
                    <select
                      value={newPlanType}
                      onChange={(e: any) => setNewPlanType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="family">Family Group (B2C)</option>
                      <option value="company">Corporate / Company (B2B)</option>
                      <option value="individual">Individual Patient</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Billing Cycle
                    </label>
                    <select
                      value={newPlanCycle}
                      onChange={(e: any) => setNewPlanCycle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Base Price (ETB)
                    </label>
                    <input
                      type="number"
                      required
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Max Members / Seats
                    </label>
                    <input
                      type="number"
                      value={newPlanMaxMembers}
                      onChange={(e) => setNewPlanMaxMembers(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Extra Member Rate
                    </label>
                    <input
                      type="number"
                      value={newPlanExtraPrice}
                      onChange={(e) => setNewPlanExtraPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Quotas & Entitlements */}
                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Included Services & Entitlement Rules
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Free Consults (-1 for inf)</label>
                      <input
                        type="number"
                        value={newPlanConsultations}
                        onChange={(e) => setNewPlanConsultations(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Free Lab Tests</label>
                      <input
                        type="number"
                        value={newPlanLabTests}
                        onChange={(e) => setNewPlanLabTests(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Copay Discount (%)</label>
                      <input
                        type="number"
                        value={newPlanDiscount}
                        onChange={(e) => setNewPlanDiscount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition"
                  >
                    Publish Plan Tier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
