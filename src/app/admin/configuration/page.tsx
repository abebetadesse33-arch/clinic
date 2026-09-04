"use client";

import React from "react";
import Link from "next/link";
import RoleGuard from "@/components/auth/RoleGuard";
import {
  Navigation,
  FileText,
  FormInput,
  DollarSign,
  LayoutTemplate,
  LayoutDashboard,
  FolderKanban,
  MousePointerClick,
  Bell,
  Languages,
  Sliders,
  Sparkles,
  ArrowRight,
  Database,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminConfigurationHubPage() {
  const configModules = [
    {
      title: "Navigation Menus",
      description: "Manage dynamic navigation links, roles, ordering, and badge counters across all user interfaces.",
      href: "/admin/navigation",
      icon: Navigation,
      badge: "Core Nav",
    },
    {
      title: "Page Content (CMS)",
      description: "Update static and dynamic text, marketing copies, HTML, and markdown per page and section.",
      href: "/admin/content",
      icon: FileText,
      badge: "Content CMS",
    },
    {
      title: "Dynamic Forms & Fields",
      description: "Build clinical questionnaires, intake surveys, validation rules, and custom input fields.",
      href: "/admin/forms",
      icon: FormInput,
      badge: "Form Engine",
    },
    {
      title: "Service Pricing & Tiers",
      description: "Configure care subscriptions, consultation fees, discounts, and feature checklists.",
      href: "/admin/pricing",
      icon: DollarSign,
      badge: "Billing",
    },
    {
      title: "Landing Page Sections",
      description: "Customize homepage layout, hero banners, trust metrics, service cards, and FAQ items.",
      href: "/admin/landing",
      icon: LayoutTemplate,
      badge: "Public UI",
    },
    {
      title: "Dashboard Widgets",
      description: "Configure role-tailored dashboard metrics, statistical cards, charts, and activity feeds.",
      href: "/admin/dashboard-widgets",
      icon: LayoutDashboard,
      badge: "Dashboards",
    },
    {
      title: "Page Tabs Configuration",
      description: "Define dynamic tabs, icons, permissions, and counter badges across patient and clinical views.",
      href: "/admin/tabs",
      icon: FolderKanban,
      badge: "Tabs UI",
    },
    {
      title: "Action Buttons & Links",
      description: "Manage dynamic action buttons, modal triggers, API webhooks, and direct links.",
      href: "/admin/actions",
      icon: MousePointerClick,
      badge: "Actions",
    },
    {
      title: "Notification Templates",
      description: "Define real-time clinical alerts, SMS/email templates, priorities, and escalation channels.",
      href: "/admin/notifications",
      icon: Bell,
      badge: "Alerts",
    },
    {
      title: "Translations & Languages (i18n)",
      description: "Manage multilingual strings and localized dictionaries (English, Amharic, Oromo, Tigrinya).",
      href: "/admin/translations",
      icon: Languages,
      badge: "i18n",
    },
  ];

  return (
    <RoleGuard allowedRoles={["system_admin", "tenant_admin"]}>
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Dynamic Application Configuration Hub
              </h1>
            </div>
            <p className="text-xs text-slate-400 pl-13">
              Single source of truth control plane: every button, menu, form, and page is driven directly from PostgreSQL.
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-400 text-xs font-semibold">
            <Database className="w-3.5 h-3.5" />
            <span>Zero Hardcoded Data</span>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {configModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href} className="group">
                <Card className="h-full flex flex-col justify-between hover:border-teal-500/40 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5 group-hover:-translate-y-1">
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800/80 text-teal-400 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-slate-950 transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 group-hover:text-teal-400">
                        {mod.badge}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                      {mod.title}
                    </CardTitle>
                    <CardDescription className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {mod.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center text-xs font-bold text-teal-400 group-hover:translate-x-1 transition-transform">
                      <span>Manage Configuration</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </RoleGuard>
  );
}
