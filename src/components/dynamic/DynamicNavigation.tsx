"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDynamicResource } from "@/hooks/useDynamicResource";
import { DynamicIcon } from "./DynamicIcon";

export interface NavigationItemRecord {
  id: string;
  label: string;
  href: string;
  icon?: string | null;
  role?: string | null;
  order: number;
  isActive: boolean;
  requiresAuth: boolean;
  badgeKey?: string | null;
  parentId?: string | null;
}

export interface DynamicNavigationProps {
  userRole?: string;
  isAuthenticated?: boolean;
  badges?: Record<string, string | number>;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  onItemClick?: () => void;
}

export function DynamicNavigation({
  userRole = "guest",
  isAuthenticated = false,
  badges = {},
  className = "",
  itemClassName = "",
  activeItemClassName = "",
  onItemClick,
}: DynamicNavigationProps) {
  const pathname = usePathname();

  const { data: navItems, isLoading } = useDynamicResource<NavigationItemRecord[]>(
    "navigation",
    { role: userRole }
  );

  if (isLoading) {
    return (
      <nav className={`flex items-center space-x-2 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-slate-800/60 rounded-xl animate-pulse" />
        ))}
      </nav>
    );
  }

  if (!navItems || navItems.length === 0) {
    return null;
  }

  // Filter items based on auth state
  const visibleItems = navItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated && userRole === "guest") {
      return false;
    }
    return true;
  });

  return (
    <nav className={`flex items-center space-x-1 ${className}`}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        const badgeValue = item.badgeKey ? badges[item.badgeKey] : undefined;

        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onItemClick}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? `bg-teal-500/10 text-teal-300 border border-teal-500/20 font-bold ${activeItemClassName}`
                : `text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-800/60 ${itemClassName}`
            }`}
          >
            {item.icon && <DynamicIcon name={item.icon} className="w-4 h-4" />}
            <span>{item.label}</span>
            {badgeValue !== undefined && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-500 text-slate-950 font-extrabold">
                {badgeValue}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
