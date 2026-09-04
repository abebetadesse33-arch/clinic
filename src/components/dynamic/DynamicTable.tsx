"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Column<T = any> {
  key: string;
  label: string;
  type?: "text" | "date" | "badge" | "link" | "currency" | "custom";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DynamicTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function DynamicTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search records...",
  pageSize = 10,
  emptyMessage = "No records found",
  className = "",
}: DynamicTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const renderCellContent = (col: Column<T>, row: T) => {
    if (col.render) return col.render(row);
    const value = row[col.key];

    if (value === null || value === undefined) return <span className="text-slate-500">—</span>;

    switch (col.type) {
      case "date":
        try {
          return new Date(value).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch {
          return String(value);
        }
      case "currency":
        return (
          <span className="font-semibold text-emerald-400">
            {typeof value === "number"
              ? value.toLocaleString(undefined, { minimumFractionDigits: 2 })
              : String(value)}{" "}
            {row.currency || "ETB"}
          </span>
        );
      case "badge":
        return (
          <Badge variant={value === "active" || value === "completed" ? "default" : "secondary"}>
            {String(value)}
          </Badge>
        );
      case "link":
        return (
          <a
            href={String(value)}
            className="text-teal-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {String(value)}
          </a>
        );
      default:
        return String(value);
    }
  };

  if (isLoading) {
    return (
      <div className={`w-full space-y-3 ${className}`}>
        {searchable && <div className="h-10 w-64 bg-slate-800/60 rounded-xl animate-pulse" />}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-4">
          <div className="h-8 bg-slate-800/80 rounded-lg animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full space-y-4 ${className}`}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950/40 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`p-4 ${
                    col.sortable !== false ? "cursor-pointer hover:text-white select-none" : ""
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-slate-800/40" : "hover:bg-slate-800/20"
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="p-4 align-middle">
                      {renderCellContent(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Inbox className="w-8 h-8 text-slate-600" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-white">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
