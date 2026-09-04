"use client";

import React from "react";
import * as LucideIcons from "lucide-react";

interface DynamicIconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name?: string | null;
  className?: string;
  size?: number;
}

export function DynamicIcon({ name, className = "w-4 h-4", size = 16, ...props }: DynamicIconProps) {
  if (!name) return <LucideIcons.Circle className={className} width={size} height={size} {...props} />;

  // Normalize icon name (e.g. 'activity' -> 'Activity', 'heart-pulse' -> 'HeartPulse')
  const formattedName = name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");

  // Check in Lucide
  const IconComponent = (LucideIcons as any)[formattedName] || (LucideIcons as any)[name] || LucideIcons.HelpCircle;

  return <IconComponent className={className} width={size} height={size} {...props} />;
}
