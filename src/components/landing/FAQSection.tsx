"use client";

import React from "react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FAQSection() {
  const faqs = [
    {
      q: "What is included with a NiniMed Health Shield membership?",
      a: "NiniMed membership includes unlimited 24/7 on-demand virtual urgent care visits, 4 to 12 scheduled specialist consultations per month, annual baseline biometric screenings, comprehensive diagnostic lab chemistry panels, up to 25% pharmacy discounts, automated pharmacogenomic drug safety reviews, and a dedicated multidisciplinary care team.",
    },
    {
      q: "How fast can I speak with a doctor through 24/7 Virtual Care?",
      a: "Our virtual urgent care wait time averages under 2 minutes. You can connect directly through our encrypted HD telehealth video room or initiate an on-demand clinical chat with an on-duty attending physician.",
    },
    {
      q: "What payment methods are supported for memberships and services?",
      a: "We support instant Telebirr SuperApp and USSD push payments, direct Commercial Bank of Ethiopia (CBE) and Awash / Dashen Bank transfers with 1-click reference slip verification, Chapa / Visa & Mastercard debit/credit cards, cash at hospital billing desks, and corporate direct insurance billing.",
    },
    {
      q: "How does the AI Clinical Decision Support (CDSS) assist doctors?",
      a: "Our Google Gemini 1.5 Pro medical AI engine assists clinicians by generating real-time differential diagnosis briefs, screening drug-drug interactions (DDI), analyzing ECG waveforms, calculating TIMI and GRACE risk metrics, and organizing patient symptom timelines — empowering clinicians to spend more quality time with you.",
    },
    {
      q: "Can I add family members, children, or elderly parents?",
      a: "Yes. Our Multidisciplinary Family Shield plan covers up to 6 family members under a single unified dashboard. Primary account holders can manage appointments, view shared billing, and track medications for all dependents.",
    },
    {
      q: "How are my health data and medical records protected?",
      a: "All electronic medical records, clinical notes, and telemedicine sessions are protected under 21 CFR Part 11 and HIPAA compliant protocols. Every chart modification is cryptographically signed with an immutable SHA-256 hash ledger.",
    },
  ];

  return (
    <section id="faq" className="py-16 px-4 sm:px-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400">Frequently Asked Questions</span>
        <h2 className="text-3xl font-black text-white">Everything you need to know about NiniMed</h2>
        <p className="text-xs text-slate-400">Have questions? We're here to help you navigate your care journey.</p>
      </div>

      <div className="bg-slate-900/60 border border-teal-950 rounded-3xl p-6 sm:p-8">
        <Accordion>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} title={faq.q}>
              <p className="text-slate-300 text-xs leading-relaxed">{faq.a}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
