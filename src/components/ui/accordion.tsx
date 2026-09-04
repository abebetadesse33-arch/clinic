"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AccordionItem({ title, children, isOpen, onToggle, className = "" }: AccordionItemProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const toggle = onToggle || (() => setInternalOpen(!internalOpen));

  return (
    <div className={`border-b border-slate-800/80 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between py-4 text-left text-xs sm:text-sm font-bold text-white transition-all hover:text-teal-300"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180 text-teal-400" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-4 text-xs text-slate-300 leading-relaxed animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function Accordion({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`divide-y divide-slate-800/60 ${className}`}>{children}</div>;
}
