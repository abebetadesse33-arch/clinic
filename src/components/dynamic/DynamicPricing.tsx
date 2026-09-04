"use client";

import React, { useState } from "react";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ServicePricingTier {
  id: string;
  serviceName: string;
  serviceType: string;
  planCode?: string | null;
  basePrice: string;
  yearlyPrice?: string | null;
  currency: string;
  discountPercent: string;
  badge?: string | null;
  description?: string | null;
  features: string[];
  popular: boolean;
  ctaText: string;
  isActive: boolean;
}

export interface DynamicPricingProps {
  serviceType?: string;
  onSelectPlan?: (tier: ServicePricingTier, billingCycle: "monthly" | "yearly") => void;
  className?: string;
}

export function DynamicPricing({
  serviceType = "subscription",
  onSelectPlan,
  className = "",
}: DynamicPricingProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: tiers, isLoading, error } = useDynamicResource<ServicePricingTier[]>(
    "service-pricing",
    { serviceType }
  );

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 animate-pulse"
          >
            <div className="h-6 w-1/2 bg-slate-800 rounded-lg" />
            <div className="h-10 w-3/4 bg-slate-800 rounded-lg" />
            <div className="space-y-2 pt-4">
              <div className="h-4 bg-slate-800/60 rounded" />
              <div className="h-4 bg-slate-800/60 rounded" />
              <div className="h-4 bg-slate-800/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !tiers || tiers.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No active pricing plans currently available.
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center p-1 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-sm">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "monthly"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              billingCycle === "yearly"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Annual</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier) => {
          const discount = parseFloat(tier.discountPercent || "0");
          const monthlyPrice = parseFloat(tier.basePrice);
          const yearlyPrice = tier.yearlyPrice ? parseFloat(tier.yearlyPrice) : monthlyPrice * 10;
          const displayPrice = billingCycle === "monthly" ? monthlyPrice : Math.round(yearlyPrice / 12);

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 ${
                tier.popular
                  ? "bg-gradient-to-b from-teal-950/40 via-slate-900/80 to-slate-900 border-2 border-teal-500/80 shadow-2xl shadow-teal-500/10 scale-105 z-10"
                  : "bg-slate-900/60 border border-slate-800/80 hover:border-slate-700"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center space-x-1 px-3 py-1 rounded-full bg-teal-500 text-slate-950 text-[11px] font-extrabold shadow-lg shadow-teal-500/30 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  <span>{tier.badge || "Most Popular"}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{tier.serviceName}</h3>
                  {discount > 0 && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                      {discount}% OFF
                    </Badge>
                  )}
                </div>

                {tier.description && (
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                    {tier.description}
                  </p>
                )}

                <div className="flex items-baseline space-x-1.5 mb-6">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {displayPrice.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {tier.currency} / mo
                  </span>
                  {billingCycle === "yearly" && (
                    <span className="text-[10px] text-teal-400 block ml-2">
                      billed {yearlyPrice.toLocaleString()} {tier.currency}/yr
                    </span>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8 border-t border-slate-800/80 pt-6">
                  {(tier.features || []).map((feat, idx) => (
                    <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant={tier.popular ? "default" : "outline"}
                className="w-full h-11 text-xs uppercase tracking-wider"
                onClick={() => onSelectPlan?.(tier, billingCycle)}
              >
                {tier.ctaText || "Get Started"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
