"use client";

import React from "react";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { DynamicPricing } from "./DynamicPricing";
import { DynamicIcon } from "./DynamicIcon";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import Link from "next/link";

export interface LandingSectionRecord {
  id: string;
  sectionKey: string;
  title?: string | null;
  subtitle?: string | null;
  content: Record<string, any>;
  order: number;
  isActive: boolean;
}

export function DynamicLandingPage({
  onSelectPlan,
}: {
  onSelectPlan?: (tier: any, cycle: "monthly" | "yearly") => void;
}) {
  const { data: sections, isLoading, error } = useDynamicResource<LandingSectionRecord[]>(
    "landing-sections"
  );

  if (isLoading) {
    return (
      <div className="space-y-16 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-4 animate-pulse">
          <div className="h-12 bg-slate-800/80 rounded-2xl w-3/4 mx-auto" />
          <div className="h-5 bg-slate-800/60 rounded-xl w-1/2 mx-auto" />
          <div className="h-10 bg-slate-800/40 rounded-xl w-36 mx-auto mt-6" />
        </div>
      </div>
    );
  }

  if (error || !sections || sections.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        Landing page sections are currently loading from configuration.
      </div>
    );
  }

  return (
    <div className="space-y-24 pb-20">
      {sections.map((section) => (
        <DynamicSection key={section.id} section={section} onSelectPlan={onSelectPlan} />
      ))}
    </div>
  );
}

function DynamicSection({
  section,
  onSelectPlan,
}: {
  section: LandingSectionRecord;
  onSelectPlan?: (tier: any, cycle: "monthly" | "yearly") => void;
}) {
  switch (section.sectionKey) {
    case "hero":
      return <HeroSection section={section} />;
    case "trust":
      return <TrustSection section={section} />;
    case "services":
      return <ServicesSection section={section} />;
    case "pricing":
      return <PricingSection section={section} onSelectPlan={onSelectPlan} />;
    case "faq":
      return <FAQSection section={section} />;
    case "cta":
      return <CTASection section={section} />;
    default:
      return <GenericSection section={section} />;
  }
}

function HeroSection({ section }: { section: LandingSectionRecord }) {
  const { title, subtitle, content } = section;
  const primaryCta = content.primaryCta || { label: "Get Started", href: "/auth/register" };
  const secondaryCta = content.secondaryCta || { label: "Learn More", href: "#services" };
  const badge = content.badge || "Next-Generation Healthcare";

  return (
    <section className="relative pt-12 pb-8 text-center max-w-4xl mx-auto px-4">
      {badge && (
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-400 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>{badge}</span>
        </div>
      )}

      <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
        {title || "Dynamic Healthcare Clinical Platform"}
      </h1>

      <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed">
        {subtitle || "Empowering clinicians, patients, and healthcare networks with seamless dynamic EHR and AI diagnostics."}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={primaryCta.href}>
          <Button size="lg" className="space-x-2">
            <span>{primaryCta.label}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        {secondaryCta && (
          <Link href={secondaryCta.href}>
            <Button variant="outline" size="lg">
              {secondaryCta.label}
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function TrustSection({ section }: { section: LandingSectionRecord }) {
  const { title, content } = section;
  const metrics: { label: string; value: string }[] = content.metrics || [];

  if (metrics.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-4">
      {title && (
        <p className="text-center text-xs uppercase tracking-widest text-slate-500 font-semibold mb-6">
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div
            key={idx}
            className="text-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm"
          >
            <div className="text-2xl md:text-3xl font-black text-teal-400 mb-1">{m.value}</div>
            <div className="text-xs text-slate-400">{m.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesSection({ section }: { section: LandingSectionRecord }) {
  const { title, subtitle, content } = section;
  const items: { title: string; description: string; icon?: string }[] = content.items || [];

  return (
    <section id="services" className="max-w-5xl mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
          {title || "Comprehensive Clinical Services"}
        </h2>
        {subtitle && <p className="text-xs md:text-sm text-slate-400">{subtitle}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 hover:border-teal-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <DynamicIcon name={item.icon || "Activity"} className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection({
  section,
  onSelectPlan,
}: {
  section: LandingSectionRecord;
  onSelectPlan?: (tier: any, cycle: "monthly" | "yearly") => void;
}) {
  const { title, subtitle } = section;

  return (
    <section id="pricing" className="max-w-5xl mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
          {title || "Transparent Healthcare Plans"}
        </h2>
        {subtitle && <p className="text-xs md:text-sm text-slate-400">{subtitle}</p>}
      </div>

      <DynamicPricing onSelectPlan={onSelectPlan} />
    </section>
  );
}

function FAQSection({ section }: { section: LandingSectionRecord }) {
  const { title, subtitle, content } = section;
  const faqs: { question: string; answer: string }[] = content.faqs || [];

  return (
    <section className="max-w-3xl mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">{title || "Frequently Asked Questions"}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 space-y-2">
            <h4 className="text-xs font-bold text-white flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{faq.question}</span>
            </h4>
            <p className="text-xs text-slate-400 pl-6 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection({ section }: { section: LandingSectionRecord }) {
  const { title, subtitle, content } = section;
  const button = content.button || { label: "Schedule an Appointment", href: "/appointments" };

  return (
    <section className="max-w-4xl mx-auto px-4">
      <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{title || "Ready for Better Healthcare?"}</h2>
        <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto mb-6 leading-relaxed">
          {subtitle || "Join thousands of patients and clinicians managing their health seamlessly."}
        </p>
        <Link href={button.href}>
          <Button size="lg">{button.label}</Button>
        </Link>
      </div>
    </section>
  );
}

function GenericSection({ section }: { section: LandingSectionRecord }) {
  return (
    <section className="max-w-4xl mx-auto px-4">
      <h2 className="text-xl font-bold text-white mb-2">{section.title}</h2>
      {section.subtitle && <p className="text-xs text-slate-400 mb-4">{section.subtitle}</p>}
      <div className="text-xs text-slate-300">
        {typeof section.content === "string" ? section.content : JSON.stringify(section.content)}
      </div>
    </section>
  );
}
