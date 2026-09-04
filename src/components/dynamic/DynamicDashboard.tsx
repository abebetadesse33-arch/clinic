"use client";

import React from "react";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DynamicIcon } from "./DynamicIcon";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface DashboardWidgetRecord {
  id: string;
  role: string;
  widgetName: string;
  widgetType: "stats" | "list" | "chart" | "table" | "timeline" | "custom";
  title?: string | null;
  description?: string | null;
  config: Record<string, any>;
  position: number;
  gridSpan: number;
  isActive: boolean;
}

export interface DynamicDashboardProps {
  userRole: string;
  className?: string;
  customWidgetRenderers?: Record<string, (config: any) => React.ReactNode>;
}

export function DynamicDashboard({
  userRole,
  className = "",
  customWidgetRenderers = {},
}: DynamicDashboardProps) {
  const { data: widgets, isLoading, error } = useDynamicResource<DashboardWidgetRecord[]>(
    "dashboard-widgets",
    { role: userRole }
  );

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-3xl border border-slate-800 bg-slate-900/60 animate-pulse p-6 space-y-3"
          >
            <div className="h-5 w-1/3 bg-slate-800 rounded" />
            <div className="h-10 w-1/2 bg-slate-800 rounded" />
            <div className="h-4 w-2/3 bg-slate-850 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !widgets || widgets.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs">
        No active dashboard widgets configured for role: {userRole}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {widgets.map((widget) => {
        const spanClass =
          widget.gridSpan === 3
            ? "lg:col-span-3 md:col-span-2"
            : widget.gridSpan === 2
            ? "lg:col-span-2 md:col-span-2"
            : "col-span-1";

        return (
          <div key={widget.id} className={spanClass}>
            <DynamicWidgetCard widget={widget} customRenderers={customWidgetRenderers} />
          </div>
        );
      })}
    </div>
  );
}

function DynamicWidgetCard({
  widget,
  customRenderers,
}: {
  widget: DashboardWidgetRecord;
  customRenderers: Record<string, (config: any) => React.ReactNode>;
}) {
  const config = widget.config || {};

  if (customRenderers[widget.widgetName]) {
    return <>{customRenderers[widget.widgetName](config)}</>;
  }

  switch (widget.widgetType) {
    case "stats":
      return <StatsWidget widget={widget} />;
    case "list":
      return <ListWidget widget={widget} />;
    case "table":
      return <TableWidget widget={widget} />;
    case "timeline":
      return <TimelineWidget widget={widget} />;
    case "chart":
      return <ChartWidget widget={widget} />;
    default:
      return <DefaultWidget widget={widget} />;
  }
}

function StatsWidget({ widget }: { widget: DashboardWidgetRecord }) {
  const { title, description, config } = widget;
  const isPositive = config.changeType === "positive" || (config.change && !String(config.change).startsWith("-"));

  return (
    <Card className="h-full flex flex-col justify-between hover:border-slate-700">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold text-slate-400">{title || widget.widgetName}</CardTitle>
          {config.icon && (
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <DynamicIcon name={config.icon} className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="text-2xl font-black text-white tracking-tight">
          {config.value !== undefined ? String(config.value) : "—"}
          {config.unit && <span className="text-xs font-medium text-slate-400 ml-1">{config.unit}</span>}
        </div>
        {(config.change || description) && (
          <div className="flex items-center space-x-1.5 mt-2 text-xs">
            {config.change && (
              <span
                className={`flex items-center font-bold ${
                  isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                )}
                {config.change}
              </span>
            )}
            <span className="text-slate-400 text-[11px] truncate">{description || config.period || ""}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ListWidget({ widget }: { widget: DashboardWidgetRecord }) {
  const { title, description, config } = widget;
  const items: any[] = config.items || [];

  return (
    <Card className="h-full flex flex-col hover:border-slate-700">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-white">{title || widget.widgetName}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {config.icon && <DynamicIcon name={config.icon} className="w-4 h-4 text-teal-400" />}
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0 flex-1 divide-y divide-slate-800/60">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {item.icon && <DynamicIcon name={item.icon} className="w-3.5 h-3.5 text-slate-400" />}
                <div>
                  <div className="font-semibold text-white">{item.label || item.title}</div>
                  {item.subtitle && <div className="text-[11px] text-slate-400">{item.subtitle}</div>}
                </div>
              </div>
              {item.value && <div className="font-bold text-teal-400">{item.value}</div>}
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">No items available</div>
        )}
      </CardContent>
    </Card>
  );
}

function TableWidget({ widget }: { widget: DashboardWidgetRecord }) {
  const { title, config } = widget;
  const rows: any[] = config.rows || [];
  const columns: string[] = config.columns || [];

  return (
    <Card className="h-full flex flex-col hover:border-slate-700">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-bold text-white">{title || widget.widgetName}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              {columns.map((col, idx) => (
                <th key={idx} className="pb-2 font-semibold capitalize">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {rows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/20">
                {columns.map((c, cIdx) => (
                  <td key={cIdx} className="py-2.5 text-slate-300">
                    {r[c] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function TimelineWidget({ widget }: { widget: DashboardWidgetRecord }) {
  const { title, config } = widget;
  const events: any[] = config.events || [];

  return (
    <Card className="h-full flex flex-col hover:border-slate-700">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-bold text-white">{title || widget.widgetName}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-4">
        {events.map((evt, idx) => (
          <div key={idx} className="flex items-start space-x-3 text-xs">
            <div className="w-2 h-2 rounded-full bg-teal-400 ring-4 ring-teal-500/20 mt-1 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-white">{evt.title}</div>
              {evt.time && <div className="text-[10px] text-slate-400">{evt.time}</div>}
              {evt.description && <div className="text-[11px] text-slate-300 mt-0.5">{evt.description}</div>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChartWidget({ widget }: { widget: DashboardWidgetRecord }) {
  const { title, config } = widget;
  const series: { label: string; value: number }[] = config.series || [];
  const maxValue = Math.max(1, ...series.map((s) => s.value));

  return (
    <Card className="h-full flex flex-col hover:border-slate-700">
      <CardHeader className="p-5 pb-3">
        <CardTitle className="text-sm font-bold text-white">{title || widget.widgetName}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-3">
        {series.map((item, idx) => {
          const pct = Math.round((item.value / maxValue) * 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{item.label}</span>
                <span className="font-bold text-white">{item.value}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DefaultWidget({ widget }: { widget: DashboardWidgetRecord }) {
  return (
    <Card className="h-full p-5 flex flex-col justify-center text-center">
      <h4 className="text-sm font-bold text-white mb-1">{widget.title || widget.widgetName}</h4>
      <p className="text-xs text-slate-400">{widget.description || "Custom configuration"}</p>
    </Card>
  );
}
