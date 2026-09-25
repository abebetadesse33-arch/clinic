"use client";

import React from "react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FAQSection() {
  const faqs = [
    {
      q: "What outpatient services does the Habitat clinic plan to provide?",
      a: "The planned medium-clinic scope centers on outpatient primary and specialist consultations, follow-up care, and other services shown on the clinic location page. Availability depends on licensing, staffing, and confirmation by the clinic.",
    },
    {
      q: "Is the clinic open 24 hours or an emergency hospital?",
      a: "No 24-hour or hospital-level service is represented here. Confirm the clinic's operating hours before visiting. For emergencies beyond outpatient clinic capability, go to an appropriately equipped hospital or contact local emergency services.",
    },
    {
      q: "Which services require separate approval?",
      a: "Laboratory testing, pharmacy or medicine dispensing, imaging, maternity procedures, and other ancillary services may require additional authorization, premises, equipment, or qualified staff. Ask the clinic to confirm what is currently licensed and available.",
    },
    {
      q: "How do I confirm prices and payment options?",
      a: "Contact the clinic directly for its current service fees and accepted payment methods. Prices and payment channels shown elsewhere in the app should be treated as unconfirmed until the clinic publishes its approved schedule.",
    },
    {
      q: "Can family members book outpatient visits?",
      a: "Appointments may be requested for family members, subject to the clinic's confirmed services, available clinicians, and applicable consent requirements.",
    },
    {
      q: "How are health records handled?",
      a: "The clinic should explain its privacy practices, consent process, and records handling in line with applicable Ethiopian requirements. Ask the clinic how to access or request correction of your records.",
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
