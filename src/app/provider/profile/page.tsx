"use client";

import React from "react";
import RoleGuard from "@/components/auth/RoleGuard";
import ProviderProfileEditor from "@/components/provider/ProviderProfileEditor";

export default function ProviderProfilePage() {
  return (
    <RoleGuard
      allowedRoles={[
        "physician",
        "nurse_practitioner",
        "nurse",
        "triage_staff",
        "pharmacist",
        "physiotherapist",
        "occupational_therapist",
        "dietitian",
        "social_worker",
        "radiologist",
        "pathologist",
        "lab_technician",
        "genetic_counselor",
        "respiratory_therapist",
        "psychologist",
        "biologist",
        "care_coordinator",
        "system_admin",
        "tenant_admin",
      ]}
      fallbackTitle="Provider Profile Management"
      fallbackMessage="This portal allows credentialed healthcare staff and newly recruited clinicians to manage their clinical bio, service pricing, and availability schedules."
    >
      <div className="py-4">
        <ProviderProfileEditor />
      </div>
    </RoleGuard>
  );
}
