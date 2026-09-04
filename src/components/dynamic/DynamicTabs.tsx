"use client";

import React, { useState, useEffect } from "react";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "./DynamicIcon";
import { DynamicContent } from "./DynamicContent";
import { Badge } from "@/components/ui/badge";

export interface TabConfig {
  id: string;
  pageKey: string;
  tabKey: string;
  label: string;
  icon?: string | null;
  badgeKey?: string | null;
  order: number;
  isActive: boolean;
}

export interface DynamicTabsProps {
  pageKey: string;
  activeTab?: string;
  onChangeTab?: (tabKey: string) => void;
  badges?: Record<string, string | number>;
  childrenRenderers?: Record<string, React.ReactNode>;
  className?: string;
}

export function DynamicTabs({
  pageKey,
  activeTab: controlledActiveTab,
  onChangeTab,
  badges = {},
  childrenRenderers = {},
  className = "",
}: DynamicTabsProps) {
  const { data: tabs, isLoading } = useDynamicResource<TabConfig[]>("tabs", { page: pageKey });

  const [selectedTab, setSelectedTab] = useState<string>("");

  useEffect(() => {
    if (controlledActiveTab) {
      setSelectedTab(controlledActiveTab);
    } else if (tabs && tabs.length > 0 && !selectedTab) {
      setSelectedTab(tabs[0].tabKey);
    }
  }, [controlledActiveTab, tabs, selectedTab]);

  const handleSelect = (tabKey: string) => {
    setSelectedTab(tabKey);
    onChangeTab?.(tabKey);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 py-2 overflow-x-auto ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-slate-800/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tabs || tabs.length === 0) {
    return null;
  }

  const currentTab = selectedTab || tabs[0]?.tabKey;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tab Navigation List */}
      <div className="flex items-center space-x-1.5 overflow-x-auto p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm scrollbar-none">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.tabKey;
          const badgeVal = tab.badgeKey ? badges[tab.badgeKey] : undefined;

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.tabKey)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none ${
                isActive
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {tab.icon && <DynamicIcon name={tab.icon} className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {badgeVal !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-teal-400"
                  }`}
                >
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="tab-content">
        {childrenRenderers[currentTab] ? (
          childrenRenderers[currentTab]
        ) : (
          <DynamicContent pageKey={pageKey} sectionKey={currentTab} />
        )}
      </div>
    </div>
  );
}
