"use client";

import React, { useState } from "react";
import { CheckCircle2, CreditCard, Sparkles, Building2, ShieldCheck, Star } from "lucide-react";
import UniversalPaymentModal from "../payment/UniversalPaymentModal";

import { useDynamicResource } from "@/hooks/useDynamicResource";

export function PricingCards() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data: dbPlans, isLoading } = useDynamicResource<any[]>("service-pricing", {
    serviceType: "subscription",
  });

  const plans = (dbPlans && dbPlans.length > 0) ? dbPlans.map((p) => ({
    id: p.id,
    name: p.serviceName,
    priceMonthly: parseFloat(p.basePrice) || 0,
    priceYearly: p.yearlyPrice ? parseFloat(p.yearlyPrice) : (parseFloat(p.basePrice) || 0) * 10,
    badge: p.badge || (p.popular ? "Most Popular" : "Plan"),
    description: p.description || "",
    features: Array.isArray(p.features) ? p.features : [],
    popular: Boolean(p.popular),
    ctaText: p.ctaText || "Join Plan",
  })) : [
    {
      id: "individual",
      name: "Individual Membership",
      priceMonthly: 199,
      priceYearly: 1990,
      badge: "Most Popular",
      description: "Complete 24/7 on-demand virtual care, un-rushed in-office visits, on-site labs, and direct messaging.",
      features: [
        "Unlimited 24/7 On-Demand Video Triage & Chat",
        "Same-Day & Next-Day In-Office Appointments",
        "Drop-In On-Site CLIA Bloodwork & Diagnostics",
        "Direct Messaging with Your Dedicated Doctor",
        "1-Click In-App Prescription Renewals",
        "Full Mobile App Health Hub & Care Plans",
      ],
      popular: true,
      ctaText: "Join Individual Plan",
    },
    {
      id: "family",
      name: "Family Membership",
      priceMonthly: 349,
      priceYearly: 3490,
      badge: "Up to 5 Family Members",
      description: "Covers parents, children, and teens with pediatric specialists and unified family health management.",
      features: [
        "Covers Up to 5 Family Members Under One Plan",
        "Dedicated Pediatricians & Family Medicine Leads",
        "Unlimited 24/7 Virtual Urgent Care for Kids & Adults",
        "Childhood Immunizations & School Sports Physicals",
        "Unified Family Records & Direct Messaging",
        "Shared Billing & Flexible HSA/FSA Payments",
      ],
      popular: false,
      ctaText: "Join Family Plan",
    },
    {
      id: "corporate",
      name: "One Medical for Business",
      priceMonthly: 1500,
      priceYearly: 15000,
      badge: "Employer Sponsored",
      description: "Top-tier employee health benefit reducing healthcare costs while delighting employees.",
      features: [
        "Fully Subsidized Employee Memberships",
        "On-Site Flu Shot Clinics & Executive Health Days",
        "Dedicated Account Manager & ROI Analytics",
        "Integrated with Major Commercial Insurance Plans",
        "Custom Health & Ergonomics Webinars",
        "Consolidated Corporate Invoicing",
      ],
      popular: false,
      ctaText: "Contact Enterprise Sales",
    },
  ];

  const handleCheckout = (plan: any) => {
    const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
    setSelectedPlanForPayment({
      title: `${plan.name} (${billingCycle.toUpperCase()})`,
      amount,
      planId: plan.id,
    });
    setPaymentModalOpen(true);
  };

  return (
    <section id="membership" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
      {/* Checkout Modal */}
      {selectedPlanForPayment && (
        <UniversalPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            setPaymentModalOpen(false);
            alert("Membership active! Welcome to NiniMed.");
          }}
          serviceType="subscription_renewal"
          serviceTitle={selectedPlanForPayment.title}
          amountEtb={selectedPlanForPayment.amount}
          patientName="Guest Member"
        />
      )}

      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="badge-mint text-xs">Membership & Pricing</span>
        <h2 className="text-3xl sm:text-4xl font-bold text-[#162E27] font-serif-heading">
          Simple, transparent membership with zero hidden fees
        </h2>
        <p className="text-xs sm:text-sm text-[#687B74] leading-relaxed">
          One flat annual or monthly fee covers 24/7 on-demand virtual care and app features. In-person visits are billed to your regular health insurance.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className="p-1 rounded-full bg-sky-50 border border-sky-200 inline-flex items-center text-xs">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[#33413C] hover:text-sky-600"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "yearly"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-[#33413C] hover:text-sky-600"
              }`}
            >
              <span>Annual Plan</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FEF7E6] text-[#B8801C] text-[10px] font-extrabold">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const period = billingCycle === "yearly" ? "/ year" : "/ month";
          return (
            <div
              key={plan.id}
              className={`p-8 rounded-3xl border flex flex-col justify-between space-y-6 transition-all relative ${
                plan.popular
                  ? "bg-white border-sky-500 shadow-warm-lg ring-2 ring-sky-500/20"
                  : "bg-white border-[#E7E2D8] hover:border-sky-300 shadow-warm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-sky-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                  Most Popular Choice
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="badge-mint text-[10px] mb-2">{plan.badge}</span>
                  <h3 className="text-xl font-bold text-[#162E27] font-display">{plan.name}</h3>
                  <p className="text-xs text-[#687B74] mt-1.5 leading-relaxed">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1 pt-3 border-t border-[#F2EFE9]">
                  <span className="text-3xl font-bold text-[#162E27] font-display">{price} Birr</span>
                  <span className="text-xs text-[#687B74] font-medium">{period}</span>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs text-[#33413C]">
                  {plan.features.map((feat: any, i: number) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout(plan)}
                className={`w-full py-3.5 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "btn-pill-primary"
                    : "btn-pill-secondary"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{plan.ctaText}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
