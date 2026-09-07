"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DocumentUploadModal from "@/components/documents/DocumentUploadModal";

export default function DocumentUploadPage() {
  return <div><div className="px-4 pt-4 sm:px-8 sm:pt-8"><Link href="/admin/files" className="inline-flex items-center gap-2 text-xs font-bold text-teal-700"><ArrowLeft className="w-4 h-4" /> Back to documents</Link></div><DocumentUploadModal pageMode onClose={() => window.history.back()} onUploaded={() => {}} /></div>;
}